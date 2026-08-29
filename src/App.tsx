import {
  CakeSlice,
  ChefHat,
  Fish,
  Flame,
  Martini,
  Pizza,
  Salad,
  Star,
  UtensilsCrossed,
  Wheat,
  Wine,
  X,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
  categories,
  groupedMenu,
  priceOverrides,
  type MenuItem,
} from "./data/menu";

const categoryIcons: Record<string, LucideIcon> = {
  vinos: Wine,
  mixología: Martini,
  "pizza-frita": Flame,
  pizza: Pizza,
  entradas: UtensilsCrossed,
  ensaladas: Salad,
  "del-mar": Fish,
  especialidades: ChefHat,
  pasta: Wheat,
  postres: CakeSlice,
};

const priceFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const formatPrice = (price: number) => priceFormatter.format(price);

const smallImage = (image: string) => image.replace(/\.webp$/i, "-480.webp");

const pastaSauces = [
  ["Bolognesa", "La más famosa y reconfortante."],
  [
    "Alle Verdure",
    "Calabaza italiana, cebolla morada, pimientos, tomates cherries, aceitunas negras y queso feta, salteados en aceite extra virgen de oliva.",
  ],
  [
    "Amatriciana",
    "Tocino italiano, cebolla morada, salsa de tomate y pimienta negra recién molida.",
  ],
  [
    "Arrabbiata",
    "Ajo rostizado, aceitunas verdes, salsa de tomate casera y chile peperoncino.",
  ],
  [
    "Carbonara",
    "Tocino italiano, huevo, Parmesano Reggiano y pimienta negra recién molida.",
  ],
  [
    "Boscaiola",
    "Hongos portobello, tocino italiano y carne molida de sirloin.",
  ],
];

function ProductModalExtras({ category }: { category: string }) {
  if (category === "pizza") {
    return (
      <div className="modal-specials">
        <section className="modal-highlight">
          <h3>¡¡¡SUPER NOVEDAD!!!</h3>
          <p>
            Dale más sabor a tu pizza con nuestra lluvia de Parmesano Reggiano
            orgánico, servida directamente en tu mesa por $49.
          </p>
        </section>
        <section>
          <h3>Ingrediente extra por $45*</h3>
          <p>Jamón de cerdo, champiñones, cebolla, pimientos, tomates frescos y albahaca.</p>
        </section>
        <section>
          <h3>Ingrediente extra gourmet por $55</h3>
          <p>
            Alcachofas, mozzarella fresca, chorizo italiano, jamón serrano, salami,
            salami picante, camarones, tocino italiano, gorgonzola y arúgula.
          </p>
        </section>
      </div>
    );
  }

  if (category === "pasta") {
    return (
      <section className="modal-sauces">
        <h3>Elige tu salsa preferida</h3>
        <div className="modal-sauce-list">
          {pastaSauces.map(([name, description]) => (
            <div key={name}>
              <strong>{name}</strong>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (category === "pizza-frita") {
    return (
      <section className="modal-specials modal-fried-pizza">
        <h3>Los únicos en Mérida</h3>
        <p>
          Nuestras pizzas fritas mediterráneas llegan de las callejuelas de Nápoles:
          masa madre de pizza, los mejores ingredientes y un tamaño ideal para compartir.
        </p>
      </section>
    );
  }

  return null;
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [spinningItemId, setSpinningItemId] = useState<string | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalBottomRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const pauseCategoryUntilRef = useRef(0);

  useEffect(
    () => () => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-menu-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveCategory(visible.target.id);
      },
      { rootMargin: "-22% 0px -65% 0px", threshold: [0, 0.1, 0.3] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const activeButton = document.querySelector<HTMLElement>(
      `[data-category="${CSS.escape(activeCategory)}"]`,
    );
    const categoryScroll = categoryScrollRef.current;
    if (!activeButton || !categoryScroll) return;

    const centeredPosition =
      activeButton.offsetLeft - (categoryScroll.clientWidth - activeButton.offsetWidth) / 2;
    categoryScroll.scrollTo({ left: Math.max(0, centeredPosition), behavior: "smooth" });
  }, [activeCategory]);

  // En celular muestra automáticamente que existen más categorías sin bloquear el gesto manual.
// Mueve automáticamente las categorías de un lado al otro.
useEffect(() => {
  const scroller = categoryScrollRef.current;
  if (!scroller) return;

  let animationFrame = 0;
  let direction: 1 | -1 = 1;
  let lastTime = performance.now();

  let isWaitingAtEdge = false;
  let edgeTimer: number | null = null;

  const SPEED = 55;

  const reverseDirection = (newDirection: 1 | -1) => {
    isWaitingAtEdge = true;

    edgeTimer = window.setTimeout(() => {
      direction = newDirection;

      const maxScroll =
        scroller.scrollWidth - scroller.clientWidth;

      // Lo sacamos un poquito del extremo
      // para que no vuelva a detectar inmediatamente el mismo borde.
      if (direction === -1) {
        scroller.scrollLeft = Math.max(0, maxScroll - 2);
      } else {
        scroller.scrollLeft = 2;
      }

      lastTime = performance.now();
      isWaitingAtEdge = false;
    }, 1000);
  };

  const animate = (now: number) => {
    const maxScroll =
      scroller.scrollWidth - scroller.clientWidth;

    const delta = Math.min(
      (now - lastTime) / 1000,
      0.05
    );

    lastTime = now;

    if (
      maxScroll > 0 &&
      !isWaitingAtEdge &&
      Date.now() >= pauseCategoryUntilRef.current
    ) {
      scroller.scrollLeft +=
        direction * SPEED * delta;

      // EXTREMO DERECHO
      if (
        direction === 1 &&
        scroller.scrollLeft >= maxScroll - 1
      ) {
        scroller.scrollLeft = maxScroll;
        reverseDirection(-1);
      }

      // EXTREMO IZQUIERDO
      else if (
        direction === -1 &&
        scroller.scrollLeft <= 1
      ) {
        scroller.scrollLeft = 0;
        reverseDirection(1);
      }
    }

    animationFrame =
      requestAnimationFrame(animate);
  };

  animationFrame =
    requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(animationFrame);

    if (edgeTimer !== null) {
      window.clearTimeout(edgeTimer);
    }
  };
}, []);

  useEffect(() => {
    if (!selectedItem) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus?.();
    };
  }, [selectedItem]);

  const pauseCategoryAutoScroll = () => {
    pauseCategoryUntilRef.current = Date.now() + 10000;
  };

  const handleCategoryClick = (event: MouseEvent<HTMLAnchorElement>, categoryId: string) => {
    event.preventDefault();
    pauseCategoryAutoScroll();
    const section = document.getElementById(categoryId);
    if (!section) return;

    const navigation = document.querySelector<HTMLElement>(".category-nav");
    const navigationHeight = navigation?.getBoundingClientRect().height ?? 68;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;

    setActiveCategory(categoryId);
    window.history.replaceState(null, "", `#${categoryId}`);
    window.scrollTo({
      top: Math.max(0, sectionTop - navigationHeight - 16),
      behavior: "smooth",
    });
  };

  const handleProductClick = (item: MenuItem) => {
    if (spinningItemId) return;
    setSpinningItemId(item.id);
    const openingDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320;
    openTimerRef.current = window.setTimeout(() => {
      setSelectedItem(item);
      setSpinningItemId(null);
      openTimerRef.current = null;
    }, openingDelay);
  };

  const selectedCategory = selectedItem
    ? categories.find((category) => category.id === selectedItem.category)
    : null;

  return (
    <main className="site-main">
      <header className="hero">
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />
        <div className="hero-inner">
          <div className="brand-block">
            <img
              className="brand-logo"
              src="/trattoria-logo.webp"
              alt="Trattoria La Pasta"
              width="500"
              height="500"
              decoding="async"
              fetchPriority="high"
            />
            <div className="brand-copy">
              <span className="eyebrow">Menú especial</span>
              <p>La cocina italiana que ya conoces, preparada para nuestra gente de Yucatán.</p>
            </div>
          </div>
        </div>
        <div className="hero-rule">
          <span className="hero-rule-green">Recetas italianas</span>
          <span className="hero-rule-white">Ingredientes frescos</span>
          <span className="hero-rule-red">Sabor de casa</span>
        </div>
      </header>

      <nav className="category-nav" aria-label="Categorías del menú">
        <div
          className="category-scroll"
          ref={categoryScrollRef}
          onPointerDown={pauseCategoryAutoScroll}
          onWheel={pauseCategoryAutoScroll}
        >
          {categories.map((category) => {
            const Icon = categoryIcons[category.id] ?? UtensilsCrossed;
            const isActive = activeCategory === category.id;
            return (
              <a
                className={`category-link${isActive ? " is-active" : ""}`}
                data-category={category.id}
                href={`#${category.id}`}
                key={category.id}
                onClick={(event) => handleCategoryClick(event, category.id)}
                aria-current={isActive ? "location" : undefined}
              >
                <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
                <span>{category.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      <div className="menu-shell">
        <div className="menu-intro">
          <p>Precios expresados en pesos mexicanos</p>
        </div>

        {groupedMenu.map((section) => {
          const SectionIcon = categoryIcons[section.id] ?? UtensilsCrossed;
          return (
            <section className="menu-section" data-menu-section id={section.id} key={section.id}>
              <div className="section-heading">
                <h2>{section.label}</h2>
                <SectionIcon aria-hidden="true" size={34} strokeWidth={1.45} />
              </div>

              <div className="dish-grid">
                {section.items.map((item) => {
                  const price = priceOverrides[item.id] ?? item.basePrice;
                  return (
                    <button
                      className={`dish-card-link dish-card${spinningItemId === item.id ? " is-spinning" : ""}`}
                      id={`producto-${item.id}`}
                      key={item.id}
                      onClick={() => handleProductClick(item)}
                      aria-label={`Ver detalles de ${item.name}`}
                      aria-haspopup="dialog"
                      type="button"
                    >
                        <div className="dish-image-wrap">
                          <img
                            className="dish-image"
                            src={smallImage(item.image)}
                            srcSet={`${smallImage(item.image)} 480w, ${item.image} 1000w`}
                            sizes="(max-width: 760px) 104px, 112px"
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            width="480"
                            height="480"
                          />
                          {item.featured && (
                            <span className="featured-badge" title="Recomendado de la casa">
                              <Star aria-hidden="true" size={14} fill="currentColor" />
                              Favorito
                            </span>
                          )}
                        </div>
                        <div className="dish-content">
                          <div className="dish-title-row">
                            <h3>{item.name}</h3>
                            <strong>{formatPrice(price)}</strong>
                          </div>
                          {item.description && <p>{item.description}</p>}
                          <span className="view-detail">Ver detalle →</span>
                        </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer>
        <img src="/trattoria-logo.webp" alt="" width="500" height="500" loading="lazy" decoding="async" />
        <div>
          <strong>Trattoria La Pasta</strong>
          <p>Mérida, Yucatán · Menú especial</p>
        </div>
      </footer>

      {selectedItem && (
        <div
          className="dialog-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItem(null);
          }}
        >
          <div
            className="product-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            aria-describedby="product-dialog-description"
            ref={dialogRef}
          >
            <button
              className="product-dialog-close"
              type="button"
              aria-label="Cerrar detalle"
              onClick={() => setSelectedItem(null)}
              ref={closeButtonRef}
            >
              <X aria-hidden="true" size={22} />
            </button>

            <div className="product-dialog-image">
              <img
                src={selectedItem.image}
                alt={selectedItem.name}
                width="1000"
                height="1000"
                decoding="async"
              />
            </div>

            <div className="product-dialog-content">
              <p className="product-dialog-category">
                {selectedCategory?.label ?? "Trattoria La Pasta"}
              </p>
              <h2 className="product-dialog-title" id="product-dialog-title">
                {selectedItem.name}
              </h2>
              <p className="product-dialog-price">
                {formatPrice(priceOverrides[selectedItem.id] ?? selectedItem.basePrice)}
              </p>
              <p className="product-dialog-description" id="product-dialog-description">
                {selectedItem.description || "Detalle del producto seleccionado."}
              </p>

              <button
                className="product-dialog-more"
                type="button"
                onClick={() => modalBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Ver más <ChevronDown aria-hidden="true" size={17} />
              </button>

              <ProductModalExtras category={selectedItem.category} />

              <div ref={modalBottomRef} className="product-dialog-bottom">
                <button className="product-dialog-done" type="button" onClick={() => setSelectedItem(null)}>
                  Cerrar y volver al menú
                </button>
                <p className="product-dialog-hint">También puedes tocar fuera de esta ventana.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
