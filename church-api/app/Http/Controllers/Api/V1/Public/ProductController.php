<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * List all active products with filters and sorting.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->where('status', 'active');

        // Apply QueryMaster filters/search/sort
        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        // Default sort by featured first, then newest
        if (!$request->has('sort')) {
            $query->orderByDesc('is_featured')
                ->orderByDesc('id');
        }

        $perPage = $request->integer('per_page', 12);
        $products = $query->paginate($perPage);

        // Fetch all categories currently present in active products
        $categories = Product::query()
            ->where('status', 'active')
            ->distinct()
            ->pluck('category')
            ->filter()
            ->sort()
            ->values()
            ->all();

        return ProductResource::collection($products)->additional([
            'meta' => [
                'categories' => $categories,
            ],
        ]);
    }

    /**
     * Show a single product.
     */
    public function show(int $id): ProductResource
    {
        $product = Product::query()
            ->where('status', 'active')
            ->findOrFail($id);

        return new ProductResource($product);
    }
}
