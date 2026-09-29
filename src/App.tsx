import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import "./archival-theme.css";

interface Preview {
  title: string;
  introduction: string;
  highlights: string[];
  next_step: string;
}

interface PreviewResponse {
  tripId: string;
  preview: Preview;
}
interface ReportFinding {
  finding: string;
  evidence: string;
  relevance: string;
  confidence: "verified" | "probable" | "lead";
}

interface ReportPlace {
  name: string;
  location: string;
  why_it_matters: string;
  what_to_see: string;
  category?: string;
  research_role?: string;
  image_url?: string;
  map_url?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
}

interface ReportImage {
  url: string;
  title: string;
  source_url: string;
}

interface ReportItineraryDay {
  day: number;
  title: string;
  plan: string;
}

interface ReportResearchLead {
  lead: string;
  where_to_look: string;
  what_to_search: string;
}

interface ReportSource {
  title: string;
  url: string;
}

interface HeritageReport {
  title: string;
  introduction: string;
  family_connection: string;
  heritage_context: string;
  findings?: ReportFinding[];
  places: ReportPlace[];
  itinerary: ReportItineraryDay[];
  research_leads: ReportResearchLead[];
  practical_notes: string[];
  caveats: string[];
  sources: ReportSource[];
  images?: ReportImage[];
}

interface PaymentVerification {
  paid: boolean;
  status?: string;
  product?: string;
  amountCents?: number;
  email?: string | null;
  tripId?: string;
  reportId?: string;
  report?: HeritageReport;
  reportStatus?: "generating" | "ready";
}


function ReportExperience({
  report,
  product,
  amountCents,
}: {
  report: HeritageReport;
  product?: string;
  amountCents?: number;
}) {
  const findings = report.findings || [];
  const places = report.places || [];
  const itinerary = report.itinerary || [];
  const leads = report.research_leads || [];
  const images = report.images || [];
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(0);
  const selectedPlace = places[selectedPlaceIndex] || places[0];

  // Coordinates are geocoded once on the server and stored in the report.
  // Marker clicks therefore never trigger a geocoding request.
  const selectedLatitude = selectedPlace?.latitude;
  const selectedLongitude = selectedPlace?.longitude;

  const mapEmbedUrl =
    typeof selectedLatitude === "number" &&
    Number.isFinite(selectedLatitude) &&
    typeof selectedLongitude === "number" &&
    Number.isFinite(selectedLongitude)
      ? (() => {
          const latSpan = 0.012;
          const lonSpan = 0.018;
          const south = selectedLatitude - latSpan;
          const north = selectedLatitude + latSpan;
          const west = selectedLongitude - lonSpan;
          const east = selectedLongitude + lonSpan;

          return (
            "https://www.openstreetmap.org/export/embed.html?" +
            new URLSearchParams({
              bbox: [west, south, east, north].join(","),
              layer: "mapnik",
              marker: [selectedLatitude, selectedLongitude].join(","),
            }).toString()
          );
        })()
      : "";

  function selectMapPlace(index: number) {
    if (index >= 0 && index < places.length) {
      setSelectedPlaceIndex(index);
    }
  }

  const confidenceLabel = (confidence: ReportFinding["confidence"]) => {
    if (confidence === "verified") return "VERIFIED";
    if (confidence === "probable") return "PROBABLE";
    return "RESEARCH LEAD";
  };

  const placeImage = (place: ReportPlace) => place.image_url;

  const routeAnchorPoints = [
    [60, 205], [178, 141], [315, 155], [435, 91], [561, 43],
    [684, 102], [790, 192], [900, 185], [950, 55],
  ];

  return (
    <>
      <div className="report-hero">
        <div className="report-hero-copy">
          <div className="report-kicker">YOUR FAMILY JOURNEY</div>
          <h1>{report.title}</h1>
          <p className="report-hero-intro">{report.introduction}</p>
          <div className="report-hero-meta">
            <span>Research-led</span>
            <span>Places to visit</span>
            <span>Evidence & next steps</span>
          </div>
        </div>
        {images[0] ? (
          <figure className="report-hero-image">
            <img src={images[0].url} alt={images[0].title} loading="eager" />
            <figcaption>{images[0].title}</figcaption>
          </figure>
        ) : (
          <div className="report-hero-placeholder" aria-hidden="true">
            <span>FAMILY / PLACE</span>
            <strong>Where the story<br />becomes a journey.</strong>
          </div>
        )}
      </div>

      <div className="report-summary-grid">
        <section className="report-summary-card report-summary-card-featured">
          <div className="report-kicker">THE CONNECTION</div>
          <p>{report.family_connection}</p>
        </section>
        <section className="report-summary-card">
          <div className="report-kicker">THE SETTING</div>
          <p>{report.heritage_context}</p>
        </section>
      </div>

      {findings.length > 0 && (
        <section className="report-section report-discoveries">
          <div className="report-section-head">
            <div>
              <div className="report-kicker">WHAT WE DISCOVERED</div>
              <h2>The evidence, distilled.</h2>
            </div>
            <span className="report-section-count">{findings.length} findings</span>
          </div>
          <div className="discovery-grid">
            {findings.map((finding, index) => (
              <article className="discovery-card" key={finding.finding + index}>
                <div className="discovery-number">{String(index + 1).padStart(2, "0")}</div>
                <div className="discovery-confidence">{confidenceLabel(finding.confidence)}</div>
                <h3>{finding.finding}</h3>
                <p>{finding.evidence}</p>
                <div className="discovery-why">
                  <span>WHY IT MATTERS</span>
                  <p>{finding.relevance}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="report-section report-route-map">
        <div className="report-section-head">
          <div>
            <div className="report-kicker">RESEARCH ROUTE</div>
            <h2>See how the investigation moves through place.</h2>
          </div>
          <span className="report-section-count">Interactive route</span>
        </div>
        <div className="real-research-map">
          <div className="real-research-map-head">
            <div>
              <div className="report-kicker">THE PLACE ON THE MAP</div>
              <h3>{selectedPlace?.name}</h3>
              <p>
                Street-level map view for the selected research location.
              </p>
            </div>
            {selectedPlace?.map_url && (
              <a
                href={selectedPlace.map_url}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps →
              </a>
            )}
          </div>
          {mapEmbedUrl && (
            <div className="real-research-map-frame">
              <iframe
                key={mapEmbedUrl}
                src={mapEmbedUrl}
                title={"Map of " + (selectedPlace?.name || "the research place")}
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
          <div className="real-research-map-credit">
            Map data © OpenStreetMap contributors · Geocoding by Geoapify
          </div>
        </div>

        <div className="research-map">
          <div className="research-map-grid" aria-hidden="true" />
          <div className="research-map-route" aria-hidden="true">
            <svg viewBox="0 0 1000 260" preserveAspectRatio="none">
              <path d="M60 205 C180 55 285 235 420 105 S650 70 770 175 S890 210 950 55" />
            </svg>
          </div>
          <div className="research-map-caption">
            <span style={{ color: "var(--at-gold)" }}>FIELD RESEARCH</span>
            <p>Choose a location below to move the live street map above to that place. The route itself shows research order, not geographic distance.</p>
          </div>
          <div className="research-map-pins">
            {places.slice(0, 8).map((place, index) => {
              const pointCount = Math.min(places.length, routeAnchorPoints.length);
              const pointIndex =
                pointCount <= 1
                  ? 0
                  : Math.round((index * (routeAnchorPoints.length - 1)) / (pointCount - 1));
              const [x, y] = routeAnchorPoints[pointIndex];
              return (
                <button
                  type="button"
                  className="research-map-pin"
                  onClick={() => selectMapPlace(index)}
                  aria-label={"Show " + place.name + " in the map"}
                  style={{ left: (x / 10) + "%", top: (y / 2.6) + "%" }}
                  key={"pin-" + place.name + "-" + index}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className="research-map-tooltip" role="tooltip">
                    <strong>{place.name}</strong>
                    <small>{place.location}</small>
                    <em>{place.category || "Research site"}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="report-section report-journey">
        <div className="report-section-head">
          <div>
            <div className="report-kicker">YOUR JOURNEY</div>
            <h2>Follow the research on the ground.</h2>
          </div>
          <span className="report-section-count">{places.length} places</span>
        </div>
        <div className="journey-strip">
          {places.map((place, index) => (
            <article className="journey-card" id={"place-" + (index + 1)} key={place.name + place.location}>
              <div className="journey-card-top">
                <span className="journey-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="journey-location">{place.location}</span>
                {place.category && <span className="journey-category">{place.category}</span>}
              </div>
              {placeImage(place) ? (
                <img src={placeImage(place)} alt={place.name} loading="lazy" />
              ) : (
                <div className="journey-image-placeholder" aria-hidden="true">
                  <span>{place.name}</span>
                </div>
              )}
              <div className="journey-card-body">
                <h3>{place.name}</h3>
                <p className="journey-role">{place.research_role || "Research location"}</p>
                <p className="journey-matters">{place.why_it_matters}</p>
                <p>{place.what_to_see}</p>
                {place.map_url && (
                  <a className="journey-map-link" href={place.map_url} target="_blank" rel="noreferrer">
                    Open location in maps →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {images.length > 1 && (
        <section className="report-section report-gallery">
          <div className="report-section-head">
            <div>
              <div className="report-kicker">THE PLACE TODAY</div>
              <h2>A visual sense of the journey.</h2>
            </div>
          </div>
          <div className="report-image-grid">
            {images.slice(1, 5).map((image, index) => (
              <figure key={image.url + index}>
                <img src={image.url} alt={image.title} loading="lazy" />
                <figcaption>{image.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {itinerary.length > 0 && (
        <section className="report-section report-itinerary-modern">
          <div className="report-section-head">
            <div>
              <div className="report-kicker">YOUR ITINERARY</div>
              <h2>A route built around your roots.</h2>
            </div>
          </div>
          <div className="itinerary-modern">
            {itinerary.map((day) => (
              <article key={day.day}>
                <div className="itinerary-modern-day">DAY {day.day}</div>
                <div>
                  <h3>{day.title}</h3>
                  <p>{day.plan}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {leads.length > 0 && (
        <section className="report-section report-next">
          <div className="report-section-head">
            <div>
              <div className="report-kicker">WHAT TO DO NEXT</div>
              <h2>Turn today's clues into tomorrow's discoveries.</h2>
            </div>
          </div>
          <div className="next-grid">
            {leads.map((lead, index) => (
              <article key={lead.lead + index}>
                <span className="next-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{lead.lead}</h3>
                <div>
                  <span>WHERE TO LOOK</span>
                  <p>{lead.where_to_look}</p>
                </div>
                <div>
                  <span>WHAT TO SEARCH</span>
                  <p>{lead.what_to_search}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="report-bottom-grid">
        <section className="report-mini-card">
          <div className="report-kicker">PRACTICAL NOTES</div>
          <ul>{(report.practical_notes || []).map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
        <section className="report-mini-card">
          <div className="report-kicker">IMPORTANT LIMITS</div>
          <ul>{(report.caveats || []).map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
        </section>
      </div>

      {report.sources.length > 0 && (
        <section className="report-section report-evidence">
          <div className="report-section-head">
            <div>
              <div className="report-kicker">SOURCES & EVIDENCE</div>
              <h2>Research you can follow yourself.</h2>
            </div>
            <span className="report-section-count">{report.sources.length} sources</span>
          </div>
          <div className="report-sources">
            {report.sources.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                <span>{source.title}</span>
                <span>→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="report-actions" aria-label="Report actions">
        <button className="button button-dark" type="button" onClick={() => window.print()}>
          Save as PDF <span>→</span>
        </button>
      </div>

      <div className="success-footer-note">
        <span className="success-next-label">ORDER CONFIRMED</span>
        <p>
          Paid for {product === "deep" ? "Deep Heritage Trip" : "Heritage Trip"} - EUR{" "}
          {((amountCents || 0) / 100).toFixed(2)}.
        </p>
      </div>
    </>
  );
}

function App() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    ancestralPlace: "",
    birthYear: "",
    birthPlace: "",
    notes: "",
  });

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<
    "heritage" | "deep" | null
  >(null);
  const [error, setError] = useState("");
  const [payment, setPayment] =
    useState<PaymentVerification | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(true);

  useEffect(() => {
    const pathname = window.location.pathname;

    if (pathname.startsWith("/report/")) {
      const reportId = pathname.slice("/report/".length);

      if (!reportId) {
        setPaymentLoading(false);
        setError("No report was found.");
        return;
      }

      fetch(`/api/reports/${encodeURIComponent(reportId)}`)
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "Unable to load this report.",
            );
          }

          setPayment({
            paid: true,
            reportId: data.reportId,
            product: data.product,
            amountCents: data.amountCents,
            report: data.report,
            reportStatus: "ready",
          });
          setPaymentLoading(false);
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this report.",
          );
          setPaymentLoading(false);
        });

      return;
    }

    if (pathname !== "/success") {
      setPaymentLoading(false);
      return;
    }

    const sessionIdParam = new URLSearchParams(
      window.location.search,
    ).get("session_id");

    if (!sessionIdParam) {
      setPaymentLoading(false);
      setError("No Stripe session was found.");
      return;
    }

    const sessionId: string = sessionIdParam;
    let cancelled = false;

    async function verifyPayment() {
      const response = await fetch(
        `/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to verify your payment.",
        );
      }

      if (cancelled) return;

      setPayment(data);
      setPaymentLoading(false);

      if (
        data.paid &&
        data.reportStatus === "ready" &&
        data.reportId
      ) {
        window.location.replace(
          `/report/${encodeURIComponent(data.reportId)}`,
        );
        return;
      }

      if (data.paid && data.reportStatus === "generating") {
        window.setTimeout(() => {
          if (!cancelled) {
            void verifyPayment().catch((err) => {
              if (!cancelled) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to prepare your report.",
                );
              }
            });
          }
        }, 2500);
      }
    }

    void verifyPayment().catch((err) => {
      if (cancelled) return;
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify your payment.",
      );
      setPaymentLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          birthYear: form.birthYear ? Number(form.birthYear) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "We couldn't create your preview.",
        );
      }

      setPreview(data);

      setTimeout(() => {
        document
          .getElementById("preview")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(product: "heritage" | "deep") {
    if (!preview?.tripId) return;

    setCheckoutLoading(product);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId: preview.tripId,
          product,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(
          data.error || "Unable to start secure checkout.",
        );
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout.",
      );
      setCheckoutLoading(null);
    }
  }

  if (
    window.location.pathname === "/success" ||
    window.location.pathname.startsWith("/report/")
  ) {
    return (
      <div className="site-shell success-page">
        <header className="site-header">
          <a className="logo" href="/">
            <span className="logo-mark">A</span>
            <span>AncestryTrip</span>
          </a>
        </header>

        <main>
          <section className="success-section">
            <div className="success-card">
              {paymentLoading ? (
                <>
                  <div className="success-symbol">...</div>
                  <div className="kicker">
                    PAYMENT CONFIRMATION
                  </div>
                  <h1>Confirming your journey.</h1>
                  <p>
                    We are checking your payment and preparing your
                    heritage report.
                  </p>
                </>
              ) : payment?.paid && payment.report ? (
                <ReportExperience
                  report={payment.report}
                  product={payment.product}
                  amountCents={payment.amountCents}
                />
              ) : payment?.paid ? (
                <>
                  <div className="success-symbol">OK</div>
                  <div className="kicker">
                    PAYMENT CONFIRMED
                  </div>
                  <h1>Your payment was successful.</h1>
                  <p>
                    Your payment has been confirmed. We are finishing the
                    research now; this page will update automatically.
                  </p>

                  <div className="success-symbol">...</div>
                </>
              ) : (
                <>
                  <div className="success-symbol">!</div>
                  <div className="kicker">
                    PAYMENT STATUS
                  </div>
                  <h1>We could not confirm the payment.</h1>
                  <p>
                    {error ||
                      "Please return to AncestryTrip and try again."}
                  </p>

                  <a className="button button-dark" href="/">
                    Return to AncestryTrip
                    <span>-&gt;</span>
                  </a>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="logo" href="/">
          <span className="logo-mark">A</span>
          <span>AncestryTrip</span>
        </a>

        <a className="header-link" href="#start">
          Start your journey
          <span>-&gt;</span>
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="kicker">
              <span className="kicker-dot" />
              HERITAGE TRAVEL
            </div>

            <h1>
              Your family story
              <em> deserves a journey.</em>
            </h1>

            <p className="hero-description">
              Turn the places your family came from into a meaningful
              trip - with heritage research, places to explore, and a
              journey shaped around your story.
            </p>

            <div className="hero-actions">
              <a className="button button-dark" href="#start">
                Create my free preview
                <span>-&gt;</span>
              </a>

              <a className="text-link" href="#how-it-works">
                See how it works
              </a>
            </div>

            <div className="micro-trust">
              <span>✓ Free preview</span>
              <span>✓ No card required</span>
              <span>✓ One-time purchase</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=85"
                alt="A historic village landscape representing the places behind a family story"
              />
              <div className="hero-image-wash" />
              <div className="hero-image-caption">
                <span>HERITAGE / PLACE / MEMORY</span>
                <strong>Go back to the places<br />that shaped your family.</strong>
              </div>
              <div className="route-orbit route-orbit-one" />
              <div className="route-orbit route-orbit-two" />
              <span className="hero-map-pin pin-one" />
              <span className="hero-map-pin pin-two" />
              <span className="hero-map-pin pin-three" />
            </div>

            <div className="floating-note">
              <span className="note-icon">✦</span>
              <div>
                <strong>Research + journey</strong>
                <span>Built around your family, not a template.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="story-strip">
          <div>
            <span className="strip-number">01</span>
            <span>START WITH WHAT YOU KNOW</span>
          </div>

          <div>
            <span className="strip-number">02</span>
            <span>BUILD A HERITAGE JOURNEY</span>
          </div>

          <div>
            <span className="strip-number">03</span>
            <span>TAKE THE STORY WITH YOU</span>
          </div>
        </section>

        <section className="heritage-visual-band" aria-label="Heritage places and travel">
          <div className="heritage-visual-copy">
            <div className="kicker">THE PLACES BEHIND THE STORY</div>
            <h2>History becomes <em>somewhere you can go.</em></h2>
            <p>
              From a village street to an old parish church, the journey connects
              family clues with the places that still exist today.
            </p>
            <div className="visual-route">
              <span>ORIGIN</span>
              <i />
              <span>ARCHIVE</span>
              <i />
              <span>JOURNEY</span>
            </div>
          </div>

          <div className="heritage-collage">
            <figure className="collage-main">
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85"
                alt="Historic European landscape"
                loading="lazy"
              />
              <figcaption>PLACES / MEMORY / ORIGIN</figcaption>
            </figure>
            <figure className="collage-small collage-village">
              <img
                src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85"
                alt="European village landscape"
                loading="lazy"
              />
            </figure>
            <figure className="collage-small collage-archive">
              <img
                src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85"
                alt="Old handwritten research notes"
                loading="lazy"
              />
            </figure>
            <div className="collage-map" aria-hidden="true">
              <span className="map-route-line" />
              <span className="collage-pin pin-a" />
              <span className="collage-pin pin-b" />
              <span className="collage-pin pin-c" />
              <strong>RESEARCH ROUTE</strong>
            </div>
          </div>
        </section>

        <section
          className="section how-section"
          id="how-it-works"
        >
          <div className="section-intro">
            <div className="kicker">HOW IT WORKS</div>

            <h2>
              From a family clue
              <br />
              to a <em>real journey.</em>
            </h2>

            <p>
              You don't need a perfect family tree. Start with one
              place, one surname, or one old family story.
            </p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <div className="step-icon">⌖</div>
              <h3>Tell us what you know</h3>
              <p>
                Give us the ancestral place and any family details
                you already have.
              </p>
            </article>

            <article className="step-card featured-step">
              <span className="step-number">02</span>
              <div className="step-icon">✦</div>
              <h3>Get your free preview</h3>
              <p>
                Receive a personalized starting point for your
                heritage journey.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <div className="step-icon">↗</div>
              <h3>Turn it into a trip</h3>
              <p>
                Unlock a deeper heritage experience built around the
                places connected to your family.
              </p>
            </article>
          </div>
        </section>

        <section className="section start-section" id="start">
          <div className="form-panel">
            <div className="form-intro">
              <div className="kicker">
                CREATE YOUR PREVIEW
              </div>

              <h2>
                Start with
                <br />
                <em>one family place.</em>
              </h2>

              <p>
                The essentials take about a minute. You can add more
                family clues when you're ready.
              </p>

              <div className="form-benefits">
                <span>
                  <b>1.</b> Tell us where your family came from
                </span>
                <span>
                  <b>2.</b> See your free preview
                </span>
                <span>
                  <b>3.</b> Decide whether to go deeper
                </span>
              </div>
            </div>

            <form className="trip-form" onSubmit={submitForm}>
              <div className="form-progress">
                <span>YOUR FAMILY</span>
                <span>FREE PREVIEW</span>
              </div>

              <div className="field-row">
                <label>
                  First name
                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      updateField(
                        "firstName",
                        event.target.value,
                      )
                    }
                    placeholder="Marie"
                  />
                </label>

                <label>
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateField(
                        "lastName",
                        event.target.value,
                      )
                    }
                    placeholder="Lefevre"
                  />
                </label>
              </div>

              <label>
                Email address
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  placeholder="you@example.com"
                />

                <span className="field-help">
                  We'll use this for your journey report.
                </span>
              </label>

              <label>
                Ancestral place
                <input
                  required
                  value={form.ancestralPlace}
                  onChange={(event) =>
                    updateField(
                      "ancestralPlace",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Dordogne, France"
                />

                <span className="field-help">
                  A village, town, region, or country all work.
                </span>
              </label>

              <details className="more-details">
                <summary>
                  Add more family details
                  <span>+</span>
                </summary>

                <div className="details-content">
                  <div className="field-row">
                    <label>
                      Birth year
                      <input
                        type="number"
                        min="1800"
                        max="2026"
                        value={form.birthYear}
                        onChange={(event) =>
                          updateField(
                            "birthYear",
                            event.target.value,
                          )
                        }
                        placeholder="1948"
                      />
                    </label>

                    <label>
                      Birth place
                      <input
                        value={form.birthPlace}
                        onChange={(event) =>
                          updateField(
                            "birthPlace",
                            event.target.value,
                          )
                        }
                        placeholder="Paris, France"
                      />
                    </label>
                  </div>

                  <label>
                    Family clues
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(event) =>
                        updateField(
                          "notes",
                          event.target.value,
                        )
                      }
                      placeholder="A surname, occupation, immigration story, old document, village name..."
                    />
                  </label>
                </div>
              </details>

              <button
                className="button button-dark form-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Creating your preview..."
                  : "Create my free preview"}

                {!loading && <span>-&gt;</span>}
              </button>

              {error && (
                <p className="form-error">{error}</p>
              )}

              <p className="privacy-note">
                Your information is used to create your heritage
                preview and journey. No payment is required here.
              </p>
            </form>
          </div>
        </section>

        {preview && (
          <section
            className="section preview-section"
            id="preview"
          >
            <div className="preview-header">
              <div>
                <div className="kicker">
                  YOUR FREE PREVIEW
                </div>

                <h2>{preview.preview.title}</h2>
              </div>

              <span className="preview-pill">READY</span>
            </div>

            <div className="preview-main">
              <div className="preview-copy">
                <p className="preview-lead">
                  {preview.preview.introduction}
                </p>

                <div className="highlight-list">
                  {preview.preview.highlights.map(
                    (highlight, index) => (
                      <article key={highlight}>
                        <span className="highlight-number">
                          0{index + 1}
                        </span>

                        <p>{highlight}</p>
                      </article>
                    ),
                  )}
                </div>
              </div>

              <aside className="preview-cta">
                <span className="preview-label">
                  GO DEEPER
                </span>

                <h3>
                  Your preview is the beginning,
                  <em> not the destination.</em>
                </h3>

                <p>{preview.preview.next_step}</p>

                <div className="price-lines">
                  <div>
                    <strong>19 €</strong>
                    <span>Heritage Trip</span>
                  </div>

                  <div>
                    <strong>49 €</strong>
                    <span>Deep Heritage Trip</span>
                  </div>
                </div>

                <div className="checkout-buttons">
                  <button
                    className="button button-light"
                    type="button"
                    onClick={() => startCheckout("heritage")}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === "heritage"
                      ? "Opening checkout..."
                      : "Heritage Trip - 19 €"}

                    <span>-&gt;</span>
                  </button>

                  <button
                    className="button button-outline-light"
                    type="button"
                    onClick={() => startCheckout("deep")}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === "deep"
                      ? "Opening checkout..."
                      : "Deep Heritage Trip - 49 €"}

                    <span>-&gt;</span>
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}

        <section className="section pricing-section">
          <div className="pricing-heading">
            <div className="kicker">CHOOSE YOUR DEPTH</div>

            <h2>
              Your story,
              <br />
              <em>your journey.</em>
            </h2>
          </div>

          <div className="pricing-grid">
            <article className="price-card">
              <div>
                <span className="price-eyebrow">
                  HERITAGE TRIP
                </span>

                <div className="price">
                  19 € <span>one-time</span>
                </div>

                <p>
                  A focused heritage journey for a meaningful
                  connection to your family's roots.
                </p>
              </div>

              <ul>
                <li>Heritage research direction</li>
                <li>Places connected to your story</li>
                <li>Travel planning ideas</li>
              </ul>
            </article>

            <article className="price-card dark-price-card">
              <div>
                <span className="price-eyebrow">
                  DEEP HERITAGE TRIP
                </span>

                <div className="price">
                  49 € <span>one-time</span>
                </div>

                <p>
                  A richer experience for families who want to go
                  further into their history.
                </p>
              </div>

              <ul>
                <li>Deeper heritage research direction</li>
                <li>More places and story leads</li>
                <li>Detailed journey planning ideas</li>
              </ul>
            </article>
          </div>

          <p className="pricing-note">
            No subscription. Pay once for the journey you choose.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="logo">
          <span className="logo-mark">A</span>
          <span>AncestryTrip</span>
        </div>

        <p>Turn your family history into a journey.</p>

        <span>© 2026 AncestryTrip</span>
      </footer>
    </div>
  );
}

export default App;
