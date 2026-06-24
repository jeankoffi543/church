<?php

namespace Keky\QueryMaster\Tests\Models;

use Illuminate\Database\Eloquent\Model;

class ProfileModel extends Model
{
    public function searchableModel()
    {
        return $this->hasOne(SearchableModel::class);
    }
}
