const priceFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

export const formatPrice = (price: number) => `${priceFormatter.format(price)} MXN`;
export const smallImage = (image: string) => image.startsWith("/menu/") ? image.replace(/\.webp$/i, "-480.webp") : image;
