<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProductResource;
use App\Models\Product;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    use HandlesFileUploads;

    /**
     * List all products (active + draft) with filters, search, and sort.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query();

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (!$request->has('sort')) {
            $query->orderByDesc('id');
        }

        return ProductResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * List all product categories.
     */
    public function categories(): JsonResponse
    {
        $categories = Product::query()
            ->distinct()
            ->pluck('category')
            ->filter()
            ->sort()
            ->values()
            ->all();

        return response()->json(['data' => $categories]);
    }

    /**
     * Create a new product.
     */
    public function store(Request $request): JsonResponse
    {
        // Decode JSON inputs if they are sent as string in multipart/form-data
        foreach (['attributes', 'variants', 'images'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $decoded = json_decode($request->input($field), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }
        foreach (['is_digital', 'is_featured', 'unlimited_stock'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $val = $request->input($field);
                if ($val === 'true' || $val === '1') {
                    $request->merge([$field => true]);
                } elseif ($val === 'false' || $val === '0') {
                    $request->merge([$field => false]);
                }
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'base_price' => 'required|integer|min:0',
            'old_price' => 'nullable|integer|min:0',
            'category' => 'required|string|max:255',
            'badge' => 'nullable|string|max:255',
            'is_digital' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'unlimited_stock' => 'nullable|boolean',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'status' => 'required|string|in:active,draft',
            'images' => 'nullable|array',
            'attributes' => 'nullable|array',
            'variants' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();

        if (!empty($validated['is_featured'])) {
            $featuredCount = Product::where('is_featured', true)->count();
            if ($featuredCount >= 5) {
                return response()->json([
                    'message' => 'Le nombre maximum de produits vedettes est limité à 5.',
                    'errors' => ['is_featured' => ['Le nombre maximum de produits vedettes est limité à 5.']]
                ], 422);
            }
        }

        $validated['slug'] = $this->uniqueSlug($validated['slug'] ?? null, $validated['title']);

        // Handle images
        $images = $validated['images'] ?? [];
        if ($request->hasFile('image')) {
            $images[] = $this->uploadSingleFile($request->file('image'), 'products');
        }
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $images[] = $this->uploadSingleFile($file, 'products');
            }
        }
        $validated['images'] = $images;

        $product = Product::create($validated);

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    /**
     * Show a single product.
     */
    public function show(int $id): ProductResource
    {
        $product = Product::findOrFail($id);
        return new ProductResource($product);
    }

    /**
     * Update an existing product.
     */
    public function update(Request $request, int $id): ProductResource
    {
        $product = Product::findOrFail($id);

        // Decode JSON inputs if they are sent as string in multipart/form-data
        foreach (['attributes', 'variants', 'images'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $decoded = json_decode($request->input($field), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }
        foreach (['is_digital', 'is_featured', 'unlimited_stock'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $val = $request->input($field);
                if ($val === 'true' || $val === '1') {
                    $request->merge([$field => true]);
                } elseif ($val === 'false' || $val === '0') {
                    $request->merge([$field => false]);
                }
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'base_price' => 'sometimes|required|integer|min:0',
            'old_price' => 'nullable|integer|min:0',
            'category' => 'sometimes|required|string|max:255',
            'badge' => 'nullable|string|max:255',
            'is_digital' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'unlimited_stock' => 'nullable|boolean',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'status' => 'sometimes|required|string|in:active,draft',
            'images' => 'nullable|array',
            'attributes' => 'nullable|array',
            'variants' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            // Throw exception or return standard validation structure
            abort(response()->json(['errors' => $validator->errors()], 422));
        }

        $validated = $validator->validated();

        if (!empty($validated['is_featured'])) {
            $featuredCount = Product::where('is_featured', true)->where('id', '!=', $product->id)->count();
            if ($featuredCount >= 5) {
                abort(response()->json([
                    'message' => 'Le nombre maximum de produits vedettes est limité à 5.',
                    'errors' => ['is_featured' => ['Le nombre maximum de produits vedettes est limité à 5.']]
                ], 422));
            }
        }

        if (isset($validated['slug']) || isset($validated['title'])) {
            $validated['slug'] = $this->uniqueSlug(
                $validated['slug'] ?? $product->slug,
                $validated['title'] ?? $product->title,
                $product->id
            );
        }

        // Handle images
        $images = $validated['images'] ?? $product->images ?? [];
        if ($request->hasFile('image')) {
            $images[] = $this->uploadSingleFile($request->file('image'), 'products');
        }
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $images[] = $this->uploadSingleFile($file, 'products');
            }
        }
        $validated['images'] = $images;

        $product->update($validated);

        return new ProductResource($product);
    }

    /**
     * Delete a product.
     */
    public function destroy(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        
        // Delete stored files if any start with /storage/
        if (is_array($product->images)) {
            foreach ($product->images as $url) {
                $this->deleteStoredFile($url);
            }
        }

        $product->delete();

        return response()->json(status: 204);
    }

    /**
     * Build a unique slug, falling back to the title, ignoring the current row.
     */
    private function uniqueSlug(?string $slug, string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($slug ?: $title);
        $candidate = $base;
        $suffix = 2;

        while (Product::query()
            ->where('slug', $candidate)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists()
        ) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}
