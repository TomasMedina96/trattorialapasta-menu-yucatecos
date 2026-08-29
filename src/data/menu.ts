import menu from "./menu.json";

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

// Si necesitas aplicar temporalmente un precio distinto sin modificar menu.json,
// agrega aquí el ID del producto. Ejemplo: "pizza-margherita": 220.
export const priceOverrides: Record<string, number> = {};

export const categories: MenuCategory[] = menu.categorias.map((category) => ({
  id: category.id,
  label: category.nombre,
}));

export const menuItems: MenuItem[] = menu.categorias.flatMap((category) =>
  category.productos.map((product) => ({
    id: product.id,
    category: category.id,
    name: product.nombre,
    description: product.descripcion,
    basePrice: product.precio,
    image: product.imagen,
    featured: product.destacada,
  })),
);

export const groupedMenu = categories.map((category) => ({
  ...category,
  items: menuItems.filter((item) => item.category === category.id),
}));
