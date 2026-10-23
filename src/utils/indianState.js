// State of an Indian address from its PIN code. Customers have no state column,
// and the feasibility report used to print GUJARAT for every address.
// India Post assigns PIN codes by region: the first two digits name the state,
// except for the ranges below, which need the first three.
const BY_THREE = [
    [160, 160, 'Chandigarh'], [194, 194, 'Ladakh'],
    [246, 249, 'Uttarakhand'], [262, 263, 'Uttarakhand'],
    [403, 403, 'Goa'], [605, 605, 'Puducherry'],
    [737, 737, 'Sikkim'], [744, 744, 'Andaman and Nicobar Islands'],
    [790, 792, 'Arunachal Pradesh'], [793, 794, 'Meghalaya'], [795, 795, 'Manipur'],
    [796, 796, 'Mizoram'], [797, 798, 'Nagaland'], [799, 799, 'Tripura'],
    [814, 816, 'Jharkhand'], [825, 835, 'Jharkhand'],
];
const BY_TWO = [
    [11, 11, 'Delhi'], [12, 13, 'Haryana'], [14, 16, 'Punjab'], [17, 17, 'Himachal Pradesh'],
    [18, 19, 'Jammu and Kashmir'], [20, 28, 'Uttar Pradesh'], [30, 34, 'Rajasthan'],
    [36, 39, 'Gujarat'], [40, 44, 'Maharashtra'], [45, 48, 'Madhya Pradesh'], [49, 49, 'Chhattisgarh'],
    [50, 50, 'Telangana'], [51, 53, 'Andhra Pradesh'], [56, 59, 'Karnataka'], [60, 64, 'Tamil Nadu'],
    [67, 69, 'Kerala'], [70, 74, 'West Bengal'], [75, 77, 'Odisha'], [78, 78, 'Assam'], [80, 85, 'Bihar'],
];
const find = (ranges, n) => ranges.find(([from, to]) => n >= from && n <= to)?.[2] || '';

export function stateFromPincode(pincode) {
    const digits = String(pincode ?? '').replace(/\s/g, '');
    if (!/^[1-9]\d{5}$/.test(digits)) return '';
    return find(BY_THREE, Number(digits.slice(0, 3))) || find(BY_TWO, Number(digits.slice(0, 2)));
}
