import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

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
  research_value: string;
  what_to_look_for: string;
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
}

interface PaymentVerification {
  paid: boolean;
  status?: string;
  product?: string;
  amountCents?: number;
  email?: string | null;
  tripId?: string;
  report?: HeritageReport;
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
    if (window.location.pathname !== "/success") {
      setPaymentLoading(false);
      return;
    }

    const sessionId = new URLSearchParams(
      window.location.search,
    ).get("session_id");

    if (!sessionId) {
      setPaymentLoading(false);
      setError("No Stripe session was found.");
      return;
    }

    fetch(
      `/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`,
    )
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to verify your payment.",
          );
        }

        setPayment(data);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify your payment.",
        );
      })
      .finally(() => {
        setPaymentLoading(false);
      });
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

  if (window.location.pathname === "/success") {
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
                <>
                  <div className="success-symbol">OK</div>

                  <div className="kicker">
                    YOUR HERITAGE TRIP
                  </div>

                  <h1>{payment.report.title}</h1>

                  <p className="success-lead">
                    {payment.report.introduction}
                  </p>

                  <div className="report-section">
                    <div className="report-kicker">
                      YOUR FAMILY CONNECTION
                    </div>
                    <p>{payment.report.family_connection}</p>
                  </div>

                  <div className="report-section">
                    <div className="report-kicker">
                      HERITAGE CONTEXT
                    </div>
                    <p>{payment.report.heritage_context}</p>
                  </div>

                  {payment.report.findings && payment.report.findings.length > 0 ? (
                    <div className="report-section">
                      <div className="report-kicker">
                        WHAT WE FOUND
                      </div>

                      <h2>Research findings tied to your clue.</h2>

                      <div className="report-findings">
                        {(payment.report.findings || []).map((finding) => (
                        <article key={finding.finding}>
                          <div className="report-finding-top">
                            <h3>{finding.finding}</h3>
                            <span>{finding.confidence}</span>
                          </div>

                          <p>
                            <strong>Evidence</strong>
                            {finding.evidence}
                          </p>

                          <p>
                            <strong>Why it matters</strong>
                            {finding.relevance}
                          </p>
                        </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="report-section">
                    <div className="report-heading">
                      <div>
                        <div className="report-kicker">
                          PLACES TO EXPLORE
                        </div>
                        <h2>Follow the story on the ground.</h2>
                      </div>
                    </div>

                    <div className="report-place-list">
                      {(payment.report.places || []).map((place) => (
                        <article
                          className="report-place"
                          key={`${place.name}-${place.location}`}
                        >
                          <div className="report-place-top">
                            <h3>{place.name}</h3>
                            <span>{place.location}</span>
                          </div>

                          <p>
                            <strong>Why it matters</strong>
                            {place.why_it_matters}
                          </p>

                          <p>
                            <strong>What to see</strong>
                            {place.what_to_see}
                          </p>

                          <p>
                            <strong>Research value</strong>
                            {place.research_value}
                          </p>

                          <p>
                            <strong>What to look for</strong>
                            {place.what_to_look_for}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="report-section">
                    <div className="report-kicker">
                      YOUR ITINERARY
                    </div>

                    <h2>A journey built around your roots.</h2>

                    <div className="report-itinerary">
                      {(payment.report.itinerary || []).map((day) => (
                        <article key={day.day}>
                          <span className="itinerary-day">
                            DAY {day.day}
                          </span>
                          <div>
                            <h3>{day.title}</h3>
                            <p>{day.plan}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="report-section">
                    <div className="report-kicker">
                      RESEARCH LEADS
                    </div>

                    <h2>What to investigate next.</h2>

                    <div className="report-leads">
                      {(payment.report.research_leads || []).map((lead) => (
                        <article key={lead.lead}>
                          <h3>{lead.lead}</h3>
                          <p>
                            <strong>Where to look</strong>
                            {lead.where_to_look}
                          </p>
                          <p>
                            <strong>What to search</strong>
                            {lead.what_to_search}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="report-bottom-grid">
                    <div className="report-mini-card">
                      <div className="report-kicker">
                        PRACTICAL NOTES
                      </div>

                      <ul>
                        {(payment.report.practical_notes || []).map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="report-mini-card">
                      <div className="report-kicker">
                        IMPORTANT CAVEATS
                      </div>

                      <ul>
                        {(payment.report.caveats || []).map((caveat) => (
                          <li key={caveat}>{caveat}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {payment.report.sources.length > 0 && (
                    <div className="report-section">
                      <div className="report-kicker">
                        SOURCES
                      </div>

                      <h2>Research used for this journey.</h2>

                      <div className="report-sources">
                        {payment.report.sources.map((source) => (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            key={source.url}
                          >
                            <span>{source.title}</span>
                            <span>-&gt;</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="success-footer-note">
                    <span className="success-next-label">
                      ORDER CONFIRMED
                    </span>
                    <p>
                      Paid for{" "}
                      {payment.product === "deep"
                        ? "Deep Heritage Trip"
                        : "Heritage Trip"}{" "}
                      - EUR{" "}
                      {((payment.amountCents || 0) / 100).toFixed(2)}.
                    </p>
                  </div>

                  <a className="button button-dark" href="/">
                    Back to AncestryTrip
                    <span>-&gt;</span>
                  </a>
                </>
              ) : payment?.paid ? (
                <>
                  <div className="success-symbol">OK</div>
                  <div className="kicker">
                    PAYMENT CONFIRMED
                  </div>
                  <h1>Your payment was successful.</h1>
                  <p>
                    Your payment has been confirmed, but the report is
                    not available yet. Please refresh this page shortly.
                  </p>

                  <button
                    className="button button-dark"
                    type="button"
                    onClick={() => window.location.reload()}
                  >
                    Refresh report
                    <span>-&gt;</span>
                  </button>
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
            <div className="paper-card">
              <div className="paper-top">
                <span>YOUR HERITAGE JOURNEY</span>
                <span>01</span>
              </div>

              <div className="map-lines">
                <span className="map-line line-one" />
                <span className="map-line line-two" />
                <span className="map-line line-three" />

                <span className="map-dot dot-one" />
                <span className="map-dot dot-two" />
                <span className="map-dot dot-three" />
              </div>

              <div className="paper-content">
                <span className="paper-label">
                  FROM FAMILY TO PLACE
                </span>

                <h2>
                  Discover the
                  <br />
                  story behind
                  <br />
                  <em>where you come from.</em>
                </h2>

                <div className="paper-route">
                  <span>Family roots</span>
                  <span className="route-arrow">-&gt;</span>
                  <span>Places</span>
                  <span className="route-arrow">-&gt;</span>
                  <span>Your trip</span>
                </div>
              </div>
            </div>

            <div className="floating-note">
              <span className="note-icon">✦</span>

              <div>
                <strong>Made around your story</strong>
                <span>Not a generic travel guide.</span>
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
                    <strong>EUR 19</strong>
                    <span>Heritage Trip</span>
                  </div>

                  <div>
                    <strong>EUR 49</strong>
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
                      : "Heritage Trip - EUR 19"}

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
                      : "Deep Heritage Trip - EUR 49"}

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
                  EUR 19 <span>one-time</span>
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
                  EUR 49 <span>one-time</span>
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
