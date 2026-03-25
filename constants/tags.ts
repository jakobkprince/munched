export interface TagGroup {
  label: string;
  tags: string[];
}

export const TAG_GROUPS: TagGroup[] = [
  {
    label: 'Asian',
    tags: ['Chinese', 'Dim Sum', 'Japanese/Sushi', 'Ramen', 'Korean', 'Thai', 'Vietnamese', 'Filipino', 'Burmese', 'Indian'],
  },
  {
    label: 'Latin',
    tags: ['Mexican', 'Peruvian', 'Salvadoran', 'Brazilian'],
  },
  {
    label: 'European',
    tags: ['Italian', 'Pizza', 'French', 'Spanish/Tapas'],
  },
  {
    label: 'Mediterranean',
    tags: ['Mediterranean'],
  },
  {
    label: 'African & Middle Eastern',
    tags: ['Middle Eastern', 'Lebanese', 'Ethiopian', 'Moroccan'],
  },
  {
    label: 'American',
    tags: ['American', 'BBQ', 'Burgers', 'Steakhouse'],
  },
  {
    label: 'Southern',
    tags: ['Southern/Soul Food'],
  },
  {
    label: 'Seafood',
    tags: ['Seafood'],
  },
  {
    label: 'Brunch & Cafe',
    tags: ['Brunch/Breakfast', 'Cafe'],
  },
  {
    label: 'Dessert',
    tags: ['Dessert', 'Ice Cream', 'Pastry'],
  },
  {
    label: 'Drinks',
    tags: ['Cocktail', 'Bar'],
  },
];

export const ALL_TAGS: string[] = TAG_GROUPS.flatMap((group) => group.tags);

/** Maps Google Places API types to app tags */
export const PLACES_TYPE_TO_TAG: Record<string, string> = {
  chinese_restaurant: 'Chinese',
  japanese_restaurant: 'Japanese/Sushi',
  sushi_restaurant: 'Japanese/Sushi',
  korean_restaurant: 'Korean',
  thai_restaurant: 'Thai',
  vietnamese_restaurant: 'Vietnamese',
  indian_restaurant: 'Indian',
  mexican_restaurant: 'Mexican',
  italian_restaurant: 'Italian',
  pizza_restaurant: 'Pizza',
  french_restaurant: 'French',
  mediterranean_restaurant: 'Mediterranean',
  middle_eastern_restaurant: 'Middle Eastern',
  american_restaurant: 'American',
  barbecue_restaurant: 'BBQ',
  hamburger_restaurant: 'Burgers',
  steak_house: 'Steakhouse',
  seafood_restaurant: 'Seafood',
  breakfast_restaurant: 'Brunch/Breakfast',
  brunch_restaurant: 'Brunch/Breakfast',
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  dessert_restaurant: 'Dessert',
  ice_cream_shop: 'Ice Cream',
  bakery: 'Pastry',
  bar: 'Bar',
  cocktail_bar: 'Cocktail',
};

/** Tags that represent cuisine/food type — derived from Google Places types */
export const CUISINE_TAGS: Set<string> = new Set(Object.values(PLACES_TYPE_TO_TAG));
