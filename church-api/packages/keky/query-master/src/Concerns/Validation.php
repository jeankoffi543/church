<?php

namespace Keky\QueryMaster\Concerns;

use Illuminate\Support\Facades\Validator as ValidatorFacade;
use Illuminate\Validation\Validator;
use Keky\QueryMaster\Enums\FilterValidationMode;

trait Validation
{
    /**
     * @var FilterValidationMode
     */
    public $validationMode = FilterValidationMode::FILTER;

    /**
     * @var Validator
     */
    protected $validator;

    /**
     * @var array
     */
    protected $validationRules;

    /**
     * @var array
     */
    protected $validationMessages;

    /**
     * @var array
     */
    protected $validationAttributes;

    /**
     * Set validation mode
     *
     * @param  FilterValidationMode  $validationMode
     * @return static
     */
    public function setValidationMode($validationMode)
    {
        $this->validationMode = $validationMode;

        return $this;
    }

    public function setValidationRules($rules)
    {
        $this->validationRules = $rules;

        return $this;
    }

    public function validationRules()
    {
        return $this->validationRules ?? []; // @phpstan-ignore-line
    }

    public function validationFails()
    {
        $this->validator ??= $this->createValidator(); // @phpstan-ignore-line

        return $this->validator->fails();
    }

    public function validate()
    {
        $this->validator ??= $this->createValidator(); // @phpstan-ignore-line

        return $this->validator->validate();
    }

    /**
     * @return Validator
     */
    protected function createValidator()
    {
        return ValidatorFacade::make(
            $this->values,
            $this->validationRules(),
            $this->validationMessages(),
            $this->validationAttributes()
        );
    }

    public function setValidationMessages($messages)
    {
        $this->validationMessages = $messages;

        return $this;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function validationMessages()
    {
        return $this->validationMessages ?? []; // @phpstan-ignore-line
    }

    public function setValidationAttributes($attributes)
    {
        $this->validationAttributes = $attributes;

        return $this;
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array
     */
    public function validationAttributes()
    {
        return $this->validationAttributes ?? []; // @phpstan-ignore-line
    }
}
