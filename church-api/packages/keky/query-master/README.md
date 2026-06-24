# Query Master

[![Latest Version on Packagist](https://img.shields.io/packagist/v/keky/query-master.svg?style=flat-square)](https://packagist.org/packages/keky/query-master)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/keky/query-master/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/keky/query-master/actions?query=workflow%3Arun-tests+branch%3Amain)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/keky/query-master/pint.yml?branch=main&label=code%20style&style=flat-square)](https://github.com/keky/query-master/actions?query=workflow%3A"Fix+PHP+code+style+issues"+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/keky/query-master.svg?style=flat-square)](https://packagist.org/packages/keky/query-master)

Query Master is a powerful Laravel package that provides a flexible and intuitive way to add dynamic filtering, searching, and sorting capabilities to your Eloquent models. It offers a clean API to handle complex query operations while maintaining code readability and reusability.

Key features:
- 🔍 Dynamic field searching with customizable operators
- 🎯 Flexible filtering system with validation support
- 📊 Easy model sorting with custom field definitions
- 🔗 Support for relationship fields in search and filters
- ⚡ Request-based filtering for quick API implementations

## Installation

You can install the package via composer:

```bash
composer require keky/query-master
```

You can publish the config file with:

```bash
php artisan vendor:publish --tag="query-master-config"
```

This will publish the following config file:

```php
return [
    'search' => [
        'query' => 'q',
        'query_fields' => 'qf',
    ],
    'sort' => [
        'query' => 'sort',
    ],
];

## Usage

### Searchable Models

Add the `IsSearchable` trait to your model and define searchable fields:

```php
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Enums\SearchOperator;

class User extends Model
{
    use IsSearchable;

    protected array $searchable = [
        'name',                              // Default LIKE operator
        'email__gt',                         // Greater than operator
        'description' => SearchOperator::LIKE,// Explicit operator
        'profile.bio',                       // Relationship field
    ];
}
```

Then use the search scope in your queries:

```php
// Simple search
$users = User::search('john')->get();

// Search specific fields
$users = User::search('john', ['name', 'email'])->get();

// Search from request query parameters
$users = User::searchOnRequest()->get();
```

### Filterable Models

Add the `HasFilters` trait and define your filters:



```php
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Filter;

class User extends Model
{
    use HasFilters;

    protected array $filters = [
        'status',
        'role' => 'role__ilk',
        'created_at',
    ];
}
```
Or if you want more control

```php
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Filter;

class User extends Model
{
    use HasFilters;

    public function filters(): array
    {
        return [
            Filter::make('status'),
            Filter::make('role', 'role__ilk')->validate(['role'=> ['required', 'in:admin,user']]),
            Filter::make('created_at')->setOperator(FilterOperator::GREATER),
        ];
    }
}
```

Apply filters in your queries:

```php
// Apply specific filters
$users = User::filter([
    'status' => 'active',
    'role' => 'admin',
])->get();

// Filter from request query parameters
$users = User::filterOnRequest()->get();
```

### Sortable Models

Add the `IsSortable` trait and define sortable fields:

```php
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SortDirection;

class User extends Model
{
    use IsSortable;

    protected array $sortable = [
        'name',
        'email',
        'created_at' => SortDirection::DESC, // Default direction
    ];
}
```

Sort your queries:

```php
// Sort by specific fields
$users = User::sort([
    'name' => 'asc',
    'created_at' => 'desc',
])->get();

// Sort from request query parameters
$users = User::sortOnRequest()->get();
```

### Combining Features

All features can be used together:

```php
$users = User::query()
    ->search('john')
    ->filter(['status' => 'active'])
    ->sort(['created_at' => 'desc'])
    ->get();

// Or from request:
$users = User::searchOnRequest()
    ->filterOnRequest()
    ->sortOnRequest()
    ->get();
```

## Testing

```bash
composer test
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](../../security/policy) on how to report security vulnerabilities.

## Credits

- [Fawaz AJANI](https://github.com/keky-tech)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
