<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    /**
     * Curated currencies: seeded active with an indicative exchange_rate
     * (relative to the XOF pivot). These are the ones the public selector
     * actually surfaces (see FLAG_MAP in church-client/lib/currency.ts).
     *
     * XOF/XAF are pegged 1:1 to each other and fixed to EUR at 655.957 XOF
     * (BCEAO/BEAC treaty rate — not a market rate). All other rates below
     * are indicative approximations, not a live feed — see CurrencyService.
     */
    private const CURATED = [
        ['code' => 'XOF', 'symbol' => 'F CFA', 'exchange_rate' => 1.000000, 'is_default' => true],
        ['code' => 'XAF', 'symbol' => 'FCFA', 'exchange_rate' => 1.000000, 'is_default' => false],
        ['code' => 'EUR', 'symbol' => '€', 'exchange_rate' => 0.001524, 'is_default' => false],
        ['code' => 'USD', 'symbol' => '$', 'exchange_rate' => 0.001667, 'is_default' => false],
        ['code' => 'GBP', 'symbol' => '£', 'exchange_rate' => 0.001300, 'is_default' => false],
        ['code' => 'GHS', 'symbol' => '₵', 'exchange_rate' => 0.025000, 'is_default' => false],
        ['code' => 'NGN', 'symbol' => '₦', 'exchange_rate' => 2.580000, 'is_default' => false],
        ['code' => 'MAD', 'symbol' => 'د.م.', 'exchange_rate' => 0.016610, 'is_default' => false],
        ['code' => 'EGP', 'symbol' => '£', 'exchange_rate' => 0.081700, 'is_default' => false],
        ['code' => 'ZAR', 'symbol' => 'R', 'exchange_rate' => 0.030840, 'is_default' => false],
    ];

    /**
     * The rest of ISO 4217 — seeded inactive with a neutral placeholder rate
     * (1.000000). An admin must research the real rate and activate the ones
     * the church actually needs from `/admins/store/currencies`.
     */
    private const REST_OF_WORLD = [
        'AED' => 'د.إ', 'AFN' => '؋', 'ALL' => 'L', 'AMD' => '֏', 'ANG' => 'ƒ',
        'AOA' => 'Kz', 'ARS' => '$', 'AUD' => '$', 'AWG' => 'ƒ', 'AZN' => '₼',
        'BAM' => 'KM', 'BBD' => '$', 'BDT' => '৳', 'BGN' => 'лв', 'BHD' => '.د.ب',
        'BIF' => 'FBu', 'BMD' => '$', 'BND' => '$', 'BOB' => 'Bs.', 'BRL' => 'R$',
        'BSD' => '$', 'BTN' => 'Nu.', 'BWP' => 'P', 'BYN' => 'Br', 'BZD' => '$',
        'CAD' => '$', 'CDF' => 'FC', 'CHF' => 'CHF', 'CLP' => '$', 'CNY' => '¥',
        'COP' => '$', 'CRC' => '₡', 'CUP' => '$', 'CVE' => '$', 'CZK' => 'Kč',
        'DJF' => 'Fdj', 'DKK' => 'kr', 'DOP' => 'RD$', 'DZD' => 'دج', 'ERN' => 'Nfk',
        'ETB' => 'Br', 'FJD' => '$', 'FKP' => '£', 'GEL' => '₾', 'GGP' => '£',
        'GIP' => '£', 'GMD' => 'D', 'GNF' => 'FG', 'GTQ' => 'Q', 'GYD' => '$',
        'HKD' => '$', 'HNL' => 'L', 'HTG' => 'G', 'HUF' => 'Ft', 'IDR' => 'Rp',
        'ILS' => '₪', 'INR' => '₹', 'IQD' => 'ع.د', 'IRR' => '﷼', 'ISK' => 'kr',
        'JMD' => '$', 'JOD' => 'د.ا', 'JPY' => '¥', 'KES' => 'KSh', 'KGS' => 'с',
        'KHR' => '៛', 'KMF' => 'CF', 'KPW' => '₩', 'KRW' => '₩', 'KWD' => 'د.ك',
        'KYD' => '$', 'KZT' => '₸', 'LAK' => '₭', 'LBP' => 'ل.ل', 'LKR' => 'රු',
        'LRD' => '$', 'LSL' => 'L', 'LYD' => 'ل.د', 'MDL' => 'L', 'MGA' => 'Ar',
        'MKD' => 'ден', 'MMK' => 'K', 'MNT' => '₮', 'MOP' => 'MOP$', 'MRU' => 'UM',
        'MUR' => '₨', 'MVR' => '.ރ', 'MWK' => 'MK', 'MXN' => '$', 'MYR' => 'RM',
        'MZN' => 'MT', 'NAD' => '$', 'NIO' => 'C$', 'NOK' => 'kr', 'NPR' => '₨',
        'NZD' => '$', 'OMR' => '﷼', 'PAB' => 'B/.', 'PEN' => 'S/', 'PGK' => 'K',
        'PHP' => '₱', 'PKR' => '₨', 'PLN' => 'zł', 'PYG' => '₲', 'QAR' => '﷼',
        'RON' => 'lei', 'RSD' => 'дин.', 'RUB' => '₽', 'RWF' => 'FRw', 'SAR' => '﷼',
        'SBD' => '$', 'SCR' => '₨', 'SDG' => 'ج.س.', 'SEK' => 'kr', 'SGD' => '$',
        'SHP' => '£', 'SLE' => 'Le', 'SOS' => 'S', 'SRD' => '$', 'SSP' => '£',
        'STN' => 'Db', 'SYP' => '£', 'SZL' => 'L', 'THB' => '฿', 'TJS' => 'ЅМ',
        'TMT' => 'm', 'TND' => 'د.ت', 'TOP' => 'T$', 'TRY' => '₺', 'TTD' => '$',
        'TWD' => 'NT$', 'TZS' => 'TSh', 'UAH' => '₴', 'UGX' => 'USh', 'UYU' => '$U',
        'UZS' => 'лв', 'VES' => 'Bs.S', 'VND' => '₫', 'VUV' => 'VT', 'WST' => 'T',
        'XCD' => '$', 'XPF' => '₣', 'YER' => '﷼', 'ZMW' => 'ZK', 'ZWL' => '$',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::CURATED as $c) {
            $currency = Currency::updateOrCreate(['code' => $c['code']], [
                'symbol' => $c['symbol'],
                'exchange_rate' => $c['exchange_rate'],
                'is_default' => $c['is_default'],
                'is_active' => true,
            ]);
            if ($currency->is_default) {
                Setting::set('default_currency_id', $currency->id, 'store');
            }
        }

        foreach (self::REST_OF_WORLD as $code => $symbol) {
            Currency::firstOrCreate(['code' => $code], [
                'symbol' => $symbol,
                'exchange_rate' => 1.000000,
                'is_default' => false,
                'is_active' => false,
            ]);
        }
    }
}
