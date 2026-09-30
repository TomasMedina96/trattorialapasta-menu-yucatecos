export type MenuCategory = {
  id: string;
  label: string;
};

export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  featured: boolean;
};
