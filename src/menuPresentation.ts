const priceFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

export const formatPrice = (price: number) => `${priceFormatter.format(price)} MXN`;
export const smallImage = (image: string) => image.replace(/\.webp$/i, "-480.webp");
