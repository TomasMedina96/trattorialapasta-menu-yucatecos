import { Clock3, ArrowUpRight } from "lucide-react";

const directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=20.9797048%2C-89.6190011&dir_action=navigate";

export function RestaurantVisit() {
  return (
    <section className="restaurant-visit" aria-label="Horario y ubicación">
      <div className="visit-hours">
        <Clock3 aria-hidden="true" size={21} strokeWidth={1.6} />
        <div>
          <span>Lunes a domingo</span>
          <strong><time dateTime="13:00">13:00</time> – <time dateTime="23:30">23:30</time> h</strong>
        </div>
      </div>
      <div className="visit-location">
        <div className="visit-location-heading">
          <img src="/google-maps.png" alt="Google Maps" width="40" height="40" loading="lazy" />
          <div>
            <span>Paseo de Montejo 481</span>
            <span>Mérida, Yucatán</span>
          </div>
        </div>
      </div>
      <a className="visit-directions" href={directionsUrl} target="_blank" rel="noreferrer"
        aria-label="Cómo llegar a Trattoria La Pasta, Paseo de Montejo 481, en Google Maps">
        Cómo llegar <ArrowUpRight aria-hidden="true" size={16} />
      </a>
    </section>
  );
}
