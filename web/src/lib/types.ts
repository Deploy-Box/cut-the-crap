export interface User {
  id: string;
  email: string;
  name: string;
}

export interface RecipeStep {
  instruction: string;
  ingredients?: string[];
}

export interface Recipe {
  title: string;
  description?: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  cool_time?: string | null;
  chill_time?: string | null;
  rest_time?: string | null;
  marinate_time?: string | null;
  soak_time?: string | null;
  total_time?: string | null;
  servings?: string | null;
  ingredients: string[];
  steps: (string | RecipeStep)[];
  notes?: string[];
}

export interface SavedRecipe {
  id: string;
  title: string;
  sourceUrl?: string | null;
  createdAt?: string;
}

export interface SavedRecipeDetail extends SavedRecipe {
  description?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  coolTime?: string | null;
  chillTime?: string | null;
  restTime?: string | null;
  marinateTime?: string | null;
  soakTime?: string | null;
  totalTime?: string | null;
  servings?: string | null;
  ingredients: string[];
  steps: (string | RecipeStep)[];
  notes?: string[];
}

export interface MealPlan {
  days: {
    dayNumber: number;
    meals: {
      mealType: string;
      title: string;
      description: string;
      prepTime: string | null;
      cookTime: string | null;
      source: string;
      ingredients: string[];
      steps: string[];
    }[];
  }[];
  groceryList: { item: string; quantity: string; category: string }[];
}
