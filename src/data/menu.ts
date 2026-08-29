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

const yucatecoPrices: Record<string, number> = {
  "pizza-frita-ue-guaglio": 248,
  "pizza-frita-o-vesuvio": 237,
  "pizza-salsicce-e-cipolla": 199,
  "pizza-prosciutto-e-funghi": 192,
  "pizza-vegetariana": 189,
  "pizza-diavola": 206,
  "pizza-salame": 206,
  "pizza-amatriciana": 206,
  "pizza-margherita": 178,
  "bruschetta-ai-funghi": 132,
  provolone: 174,
  "pane-all-aglio": 104,
  "bruschetta-al-pomodoro": 132,
  "carpaccio-di-manzo": 195,
  "insalata-greca": 167,
  "insalata-fragolina": 178,
  "insalata-cesar": 174,
  "insalata-caprese": 157,
  "linguine-gamberetti-e-limone": 220,
  "spaghetti-allo-scoglio": 213,
  lasagne: 206,
  "fettuccine-alle-salsicce": 213,
  "fettuccine-salame-e-provola": 206,
  spaghetti: 171,
  fusilli: 171,
  penne: 171,
  rigatoni: 171,
  "spaghetti-integrali": 171,
  fettuccine: 181,
  "fettuccine-verdi": 181,
  "fettuccine-piccanti": 181,
  "fettuccine-all-origano": 181,
  "fettuccine-integrali": 181,
  gnocchi: 188,
  "ravioli-di-carne": 188,
  "ravioli-ricotta-e-spinaci": 188,
  "ravioli-ricotta-e-noci": 188,
  "panna-cotta-de-mango": 105,
  tiramisu: 112,
  "creme-brulee": 105,
};

export const categories: MenuCategory[] = menu.categorias
  .filter((category) => category.productos.some((product) => product.id in yucatecoPrices))
  .map((category) => ({
    id: category.id,
    label: category.nombre,
  }));

export const menuItems: MenuItem[] = menu.categorias.flatMap((category) =>
  category.productos
    .filter((product) => product.id in yucatecoPrices)
    .map((product) => ({
      id: product.id,
      category: category.id,
      name: product.nombre,
      description: product.descripcion,
      basePrice: yucatecoPrices[product.id],
      image: product.imagen,
      featured: product.destacada,
    })),
);

export const groupedMenu = categories.map((category) => ({
  ...category,
  items: menuItems.filter((item) => item.category === category.id),
}));
