<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Place a new order.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer' => 'required|array',
            'customer.first_name' => 'required|string|max:255',
            'customer.last_name' => 'required|string|max:255',
            'customer.phone' => 'required|string|max:255',
            'customer.email' => 'required|email|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required',
            'items.*.product_title' => 'required|string|max:255',
            'items.*.variant_id' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|integer|min:0',
            'items.*.selected_attributes' => 'nullable|array',
            'delivery_key' => 'required|string',
            'payment_method' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();

        // Retrieve delivery price and label from settings
        $deliveryOptions = Setting::get('delivery_options') ?? [];
        $deliveryFee = 0;
        $deliveryLabel = '';
        foreach ($deliveryOptions as $opt) {
            if (isset($opt['key']) && $opt['key'] === $validated['delivery_key']) {
                $deliveryFee = (int) ($opt['price'] ?? 0);
                $deliveryLabel = $opt['label'] ?? '';
                break;
            }
        }

        if (empty($deliveryLabel)) {
            // Fallback default
            $deliveryLabel = ucfirst($validated['delivery_key']);
        }

        // Generate unique sequential reference: MFM-XXXX
        // We look at the highest ID and add 1
        $nextId = (Order::max('id') ?? 0) + 1;
        $reference = 'MFM-'.(2041 + $nextId);

        // Compute subtotal on server for safety
        $subtotal = 0;
        foreach ($validated['items'] as $item) {
            $subtotal += (int) $item['price'] * (int) $item['quantity'];
        }

        $totalAmount = $subtotal + $deliveryFee;

        // Auto determine payment status for mock payment flow
        $paymentStatus = 'pending';
        $onlineMethods = ['Orange Money', 'Wave', 'MTN Money', 'Carte bancaire'];
        if (in_array($validated['payment_method'], $onlineMethods, true)) {
            $paymentStatus = 'paid';
        }

        // 1. Validate all products existence, status, and stock availability before writing to DB
        foreach ($validated['items'] as $item) {
            if (is_numeric($item['product_id'])) {
                $product = Product::find($item['product_id']);
                if (! $product) {
                    return response()->json(['message' => "Le produit \"{$item['product_title']}\" n'existe pas."], 422);
                }
                if ($product->status !== 'active') {
                    return response()->json(['message' => "Le produit \"{$product->title}\" n'est plus actif."], 422);
                }

                $isProductUnlimited = (bool) ($product->unlimited_stock ?? false);
                $variants = $product->variants ?? [];
                if (! $isProductUnlimited && ! empty($variants)) {
                    $matchedVar = null;
                    $targetVariantId = $item['variant_id'] ?? null;

                    // Match variant
                    if ($targetVariantId) {
                        foreach ($variants as $var) {
                            if (isset($var['id']) && $var['id'] === $targetVariantId) {
                                $matchedVar = $var;
                                break;
                            }
                        }
                    }
                    if (! $matchedVar && ! empty($item['selected_attributes'])) {
                        foreach ($variants as $var) {
                            $varAttrs = $var['attributes'] ?? [];
                            $allMatch = true;
                            foreach ($item['selected_attributes'] as $attrName => $selectedVal) {
                                if (($varAttrs[$attrName] ?? null) !== $selectedVal) {
                                    $allMatch = false;
                                    break;
                                }
                            }
                            if ($allMatch) {
                                $matchedVar = $var;
                                break;
                            }
                        }
                    }
                    if (! $matchedVar) {
                        foreach ($variants as $var) {
                            if (isset($var['id']) && $var['id'] === 'default') {
                                $matchedVar = $var;
                                break;
                            }
                        }
                    }

                    if ($matchedVar) {
                        $isVarUnlimited = isset($matchedVar['unlimited_stock']) && (bool) $matchedVar['unlimited_stock'];
                        if (! $isVarUnlimited) {
                            $varStock = (int) ($matchedVar['stock_count'] ?? 0);
                            $requestedQty = (int) $item['quantity'];
                            if ($varStock < $requestedQty) {
                                return response()->json([
                                    'message' => "Le stock pour le produit \"{$product->title}\" est insuffisant (restant: {$varStock}).",
                                ], 422);
                            }
                        }
                    }
                }
            }
        }

        DB::beginTransaction();
        try {
            $order = Order::create([
                'reference' => $reference,
                'customer_first_name' => $validated['customer']['first_name'],
                'customer_last_name' => $validated['customer']['last_name'],
                'customer_phone' => $validated['customer']['phone'],
                'customer_email' => $validated['customer']['email'],
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'total_amount' => $totalAmount,
                'delivery_key' => $validated['delivery_key'],
                'delivery_label' => $deliveryLabel,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $paymentStatus,
                'fulfillment_status' => 'nouvelle',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => is_numeric($item['product_id']) ? (int) $item['product_id'] : null,
                    'variant_id' => $item['variant_id'] ?? null,
                    'product_title' => $item['product_title'],
                    'quantity' => (int) $item['quantity'],
                    'price' => (int) $item['price'],
                    'selected_attributes' => $item['selected_attributes'] ?? null,
                ]);

                // Decrement stock in DB
                if (is_numeric($item['product_id'])) {
                    $product = Product::find($item['product_id']);
                    if ($product && ! (bool) ($product->unlimited_stock ?? false)) {
                        $variants = $product->variants ?? [];
                        if (! empty($variants)) {
                            $matchedVarKey = null;
                            $targetVariantId = $item['variant_id'] ?? null;

                            if ($targetVariantId) {
                                foreach ($variants as $k => $var) {
                                    if (isset($var['id']) && $var['id'] === $targetVariantId) {
                                        $matchedVarKey = $k;
                                        break;
                                    }
                                }
                            }
                            if ($matchedVarKey === null && ! empty($item['selected_attributes'])) {
                                foreach ($variants as $k => $var) {
                                    $varAttrs = $var['attributes'] ?? [];
                                    $allMatch = true;
                                    foreach ($item['selected_attributes'] as $attrName => $selectedVal) {
                                        if (($varAttrs[$attrName] ?? null) !== $selectedVal) {
                                            $allMatch = false;
                                            break;
                                        }
                                    }
                                    if ($allMatch) {
                                        $matchedVarKey = $k;
                                        break;
                                    }
                                }
                            }
                            if ($matchedVarKey === null) {
                                foreach ($variants as $k => $var) {
                                    if (isset($var['id']) && $var['id'] === 'default') {
                                        $matchedVarKey = $k;
                                        break;
                                    }
                                }
                            }

                            if ($matchedVarKey !== null) {
                                $isVarUnlimited = isset($variants[$matchedVarKey]['unlimited_stock']) && (bool) $variants[$matchedVarKey]['unlimited_stock'];
                                if (! $isVarUnlimited) {
                                    $variants[$matchedVarKey]['stock_count'] = max(0, (int) ($variants[$matchedVarKey]['stock_count'] ?? 0) - (int) $item['quantity']);
                                    $product->variants = $variants;
                                    $product->save();
                                }
                            }
                        }
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Commande enregistrée avec succès.',
                'data' => new OrderResource($order->load('items')),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'enregistrement de votre commande.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
