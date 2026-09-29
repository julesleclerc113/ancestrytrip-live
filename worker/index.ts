interface TripInput {
  email: string;
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  birthPlace?: string;
  ancestralPlace: string;
  notes?: string;
}

interface CheckoutRequest {
  tripId: string;
  product: "heritage" | "deep";
}

interface StripeSession {
  id: string;
  url?: string | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  metadata?: Record<string, string>;
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

interface ReportImage {
  url: string;
  title: string;
  source_url: string;
}

interface HeritageReport {
  title: string;
  map_coordinates_version?: number;
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
  image_hydration_version?: number;
}

const PRODUCTS = {
  heritage: {
    priceId: "price_1UI5kQCg8BDmZixjQaIE3Imf",
    amountCents: 1900,
    name: "Heritage Trip",
    days: 3,
  },
  deep: {
    priceId: "price_1UI5ktCg8BDmZixjwAT0oMbI",
    amountCents: 4900,
    name: "Deep Heritage Trip",
    days: 5,
  },
} as const;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function buildPreview(input: TripInput) {
  const place = input.ancestralPlace.trim();

  return {
    title: `Your ancestral journey through ${place}`,
    introduction:
      `Your family connection to ${place} can become the starting point for a meaningful heritage journey. We combine the places, history, and family clues you provide into a travel experience built around your story.`,
    highlights: [
      `Explore the history and character of ${place}.`,
      "Identify records, landmarks, archives, and places connected to your family story.",
      "Build a practical heritage itinerary around your ancestral connection.",
    ],
    next_step:
      "Your paid Heritage Trip can turn this starting point into a detailed journey with research leads, places to visit, and a day-by-day itinerary.",
  };
}

function buildFallbackReport(
  trip: {
    first_name: string | null;
    last_name: string | null;
    ancestral_place: string;
    birth_year: number | null;
    birth_place: string | null;
    notes: string | null;
  },
  product: keyof typeof PRODUCTS,
): HeritageReport {
  const selected = PRODUCTS[product];
  const person =
    [trip.first_name, trip.last_name].filter(Boolean).join(" ") ||
    "your family";

  return {
    title: `${person}'s heritage journey through ${trip.ancestral_place}`,
    introduction:
      `This starter heritage report is built around ${trip.ancestral_place}. It identifies a practical starting point for researching your family connection and planning a future visit.`,
    family_connection:
      `The strongest starting clue currently supplied is the ancestral place: ${trip.ancestral_place}. More precise genealogical conclusions should be made only after checking original records.`,
    heritage_context:
      `${trip.ancestral_place} is the geographic anchor for this journey. A deeper investigation should connect the place to civil, religious, census, immigration, land, military, and local historical records as appropriate.`,
    places: [
      {
        name: trip.ancestral_place,
        location: trip.ancestral_place,
        why_it_matters:
          "This is the primary geographic clue in your family history.",
        what_to_see:
          "Begin with the historic centre, local archive or museum, parish or civil-record resources, and a local cemetery where relevant.",
        category: "Origin",
        research_role: "Primary geographic anchor",
        map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.ancestral_place)}`,
      },
    ],
    itinerary: Array.from(
      { length: selected.days },
      (_, index) => ({
        day: index + 1,
        title:
          index === 0
            ? "Arrive and orient yourself"
            : index === 1
              ? "Follow the family trail"
              : "Research and reflect",
        plan:
          index === 0
            ? `Walk through ${trip.ancestral_place} and identify the places that define the historic area.`
            : index === 1
              ? "Visit relevant churches, cemeteries, archives, museums, or neighbourhoods connected with the family clue."
              : "Reserve time for local research, photographs, notes, and checking records that could confirm family connections.",
      }),
    ),
    research_leads: [
      {
        lead: "Civil registration",
        where_to_look:
          "Local or regional civil-registration archives.",
        what_to_search:
          `Birth, marriage, and death records associated with the family and ${trip.ancestral_place}.`,
      },
      {
        lead: "Religious records",
        where_to_look:
          "Parish, diocesan, or religious archives where applicable.",
        what_to_search:
          "Baptisms, marriages, burials, and family witnesses.",
      },
      {
        lead: "Local history",
        where_to_look:
          "Municipal archives, libraries, museums, and local-history societies.",
        what_to_search:
          `Historic streets, occupations, communities, migrations, and family names in ${trip.ancestral_place}.`,
      },
    ],
    practical_notes: [
      "Verify opening hours and archive access before travelling.",
      "Bring copies or photographs of the family documents you already have.",
      "Treat family stories as clues until they are confirmed by original records.",
    ],
    caveats: [
      "This report is a research and travel starting point, not proof of lineage.",
      "Names and places can have multiple spellings and historical boundaries.",
      "Original records should be checked before drawing genealogical conclusions.",
    ],
    sources: [],
    images: [],
  };
}

function normalizeHeritageReport(
  raw: unknown,
  trip: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    ancestral_place: string;
    birth_year: number | null;
    birth_place: string | null;
    notes: string | null;
  },
): HeritageReport {
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as Record<string, unknown>).places) &&
    Array.isArray((raw as Record<string, unknown>).itinerary) &&
    Array.isArray((raw as Record<string, unknown>).research_leads)
  ) {
    return raw as HeritageReport;
  }

  const source = raw as Record<string, any>;

  const place =
    source.place_resolution ||
    source.geographic_resolution ||
    {};

  const evaluation =
    source.family_research_evaluation ||
    source.evidence_evaluation ||
    source.investigation_and_evidence_chain ||
    source.family_research_evaluation_and_evidence ||
    {};

  const findings: ReportFinding[] = [];

  const primaryTarget =
    evaluation.primary_target;

  if (
    primaryTarget &&
    typeof primaryTarget === "object"
  ) {
    const name = [
      primaryTarget.given_name,
      primaryTarget.surname,
    ]
      .filter(Boolean)
      .join(" ");

    findings.push({
      finding:
        primaryTarget.analysis ||
        `Family research target${name ? `: ${name}` : ""}`,
      evidence:
        primaryTarget.analysis ||
        "The supplied family clue requires further documentary verification.",
      relevance:
        "This defines the identity and surname problem that the archival investigation needs to resolve.",
      confidence: "lead",
    });
  }

  if (evaluation.investigative_verdict) {
    findings.push({
      finding:
        evaluation.evidence_chain_status ||
        "Current research assessment",
      evidence:
        evaluation.investigative_verdict,
      relevance:
        "This establishes the current documentary limit of the investigation and determines which primary sources should be checked next.",
      confidence: "lead",
    });
  }

  if (evaluation.warning_on_false_positives) {
    findings.push({
      finding: "False-positive warning",
      evidence:
        evaluation.warning_on_false_positives,
      relevance:
        "This prevents unrelated historical people with similar surnames from being treated as direct ancestors.",
      confidence: "lead",
    });
  }

  const rawPlaces =
    source.key_research_repositories ||
    source.heritage_landscape_key_institutions ||
    source.heritage_and_archival_landscape ||
    source.research_landscape_and_repositories ||
    source.key_heritage_and_archival_locations ||
    [];

  const places: ReportPlace[] = (
    Array.isArray(rawPlaces)
      ? rawPlaces
      : []
  )
    .filter(
      (item: any) =>
        item &&
        typeof item === "object",
    )
    .map((item: any) => ({
      name:
        item.name ||
        item.institution_name ||
        "Research resource",
      location:
        item.address ||
        item.location ||
        trip.ancestral_place,
      why_it_matters:
        item.holdings_and_purpose ||
        item.research_relevance ||
        item.collection_relevance ||
        item.research_value ||
        item.institutional_function ||
        "Relevant to the family-history investigation.",
      what_to_see:
        item.access_details ||
        item.holdings_and_purpose ||
        item.target_records_to_examine ||
        item.description ||
        item.target_records ||
        "Review the relevant collections and historical material.",
      category:
        item.category ||
        item.place_type ||
        item.type ||
        "Research site",
      research_role:
        item.research_role ||
        item.role ||
        item.research_purpose ||
        "Relevant to the investigation",
      latitude:
        typeof item.latitude === "number"
          ? item.latitude
          : undefined,
      longitude:
        typeof item.longitude === "number"
          ? item.longitude
          : undefined,
    }))
    .slice(0, 8);

  const rawItinerary =
    source.itinerary ||
    source.research_led_itinerary?.days ||
    source.three_day_heritage_itinerary ||
    source.five_day_heritage_itinerary ||
    source.heritage_itinerary ||
    [];

  const itinerary: ReportItineraryDay[] = (
    Array.isArray(rawItinerary)
      ? rawItinerary
      : []
  )
    .filter(
      (item: any) =>
        item &&
        typeof item === "object",
    )
    .map((item: any, index: number) => {
      const morning =
        item.morning || {};
      const afternoon =
        item.afternoon || {};
      const evening =
        item.evening || {};

      const blockText = (
        label: string,
        block: any,
      ) => {
        if (
          !block ||
          typeof block !== "object"
        ) {
          return "";
        }

        return [
          block.time
            ? `${label} ${block.time}.`
            : `${label}:`,
          block.location
            ? `Location: ${block.location}.`
            : "",
          block.action
            ? `Action: ${block.action}.`
            : "",
          block.research_rationale
            ? `Why it matters: ${block.research_rationale}`
            : "",
          block.investigative_value
            ? `Why it matters: ${block.investigative_value}`
            : "",
          block.research_purpose
            ? `Research purpose: ${block.research_purpose}`
            : "",
        ]
          .filter(Boolean)
          .join(" ");
      };

      const eveningAction =
        item.evening_action;

      const plan = [
        item.objective
          ? `Objective: ${item.objective}`
          : "",
        blockText(
          "Morning",
          morning,
        ),
        blockText(
          "Afternoon",
          afternoon,
        ),
        blockText(
          "Evening",
          evening,
        ),
        eveningAction &&
        typeof eveningAction === "object"
          ? [
              "Evening:",
              eveningAction.task
                ? `Task: ${eveningAction.task}.`
                : "",
              eveningAction.action
                ? `Action: ${eveningAction.action}.`
                : "",
            ]
              .filter(Boolean)
              .join(" ")
          : eveningAction
            ? `Evening: ${eveningAction}`
            : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        day:
          Number(item.day_number) ||
          Number(item.day) ||
          index + 1,
        title:
          item.theme ||
          item.title ||
          item.objective ||
          `Heritage research day ${index + 1}`,
        plan,
      };
    });

  const roadmap =
    source.research_roadmap_and_next_steps ||
    source.actionable_next_steps ||
    source.actionable_next_steps_for_investigator ||
    {};

  const rawResearchLeads =
    roadmap.concrete_investigation_steps ||
    roadmap.crucial_next_steps_for_customer ||
    roadmap.next_steps ||
    (Array.isArray(roadmap)
      ? roadmap
      : []);

  const researchLeads: ReportResearchLead[] =
    Array.isArray(rawResearchLeads)
      ? rawResearchLeads
          .filter(
            (item: any) =>
              typeof item === "string" ||
              (
                item &&
                typeof item === "object"
              ),
          )
          .map((item: any) => {
            if (
              typeof item === "string"
            ) {
              return {
                lead: item,
                where_to_look:
                  "Use the relevant archive, genealogy organisation, or historical repository identified in the report.",
                what_to_search: item,
              };
            }

            return {
              lead:
                item.action ||
                item.lead ||
                item.title ||
                `Research step ${item.step || ""}`.trim(),
              where_to_look:
                item.where_to_look ||
                item.institution ||
                "Use the relevant archive or genealogy repository identified in the report.",
              what_to_search:
                item.detail ||
                item.guidance ||
                item.what_to_search ||
                item.action ||
                "Search for records connecting the family clue to a specific person, date, and place.",
            };
          })
      : [];

  const practicalNotes: string[] = [];

  if (
    Array.isArray(source.practical_notes)
  ) {
    practicalNotes.push(
      ...source.practical_notes.filter(
        (item: unknown): item is string =>
          typeof item === "string",
      ),
    );
  }

  if (place.postal_code) {
    practicalNotes.push(
      `Postal code: ${place.postal_code}.`,
    );
  }

  if (place.department) {
    practicalNotes.push(
      `Department: ${place.department}.`,
    );
  }

  if (place.region) {
    practicalNotes.push(
      `Region: ${place.region}.`,
    );
  }

  const caveats: string[] = [];

  if (evaluation.investigative_verdict) {
    caveats.push(
      evaluation.investigative_verdict,
    );
  }

  if (
    evaluation.evidence_chain_status &&
    !caveats.includes(
      evaluation.evidence_chain_status,
    )
  ) {
    caveats.push(
      evaluation.evidence_chain_status,
    );
  }

  if (
    evaluation.warning_on_false_positives &&
    !caveats.includes(
      evaluation.warning_on_false_positives,
    )
  ) {
    caveats.push(
      evaluation.warning_on_false_positives,
    );
  }

  if (!trip.birth_year) {
    caveats.push(
      "No birth year was supplied, which limits the ability to distinguish people with the same name.",
    );
  }

  if (!trip.birth_place) {
    caveats.push(
      "No birth place was supplied, so the family clue cannot yet be tied to a specific individual through that detail.",
    );
  }

  const historicalJurisdictions =
    place.historical_jurisdictions;

  const jurisdictionText =
    historicalJurisdictions &&
    typeof historicalJurisdictions === "object"
      ? Object.entries(
          historicalJurisdictions,
        )
          .map(
            ([key, value]) =>
              `${key.replaceAll("_", " ")}: ${value}`,
          )
          .join("; ")
      : "";

  const historicalParishes =
    Array.isArray(
      place.historical_parishes_pre_1792,
    )
      ? place.historical_parishes_pre_1792.join(
          ", ",
        )
      : "";

  const heritageContext = [
    place.modern_municipality
      ? `Modern municipality: ${place.modern_municipality}.`
      : "",
    place.historical_province
      ? `Historical province: ${place.historical_province}.`
      : "",
    jurisdictionText
      ? `Historical jurisdictions: ${jurisdictionText}.`
      : "",
    historicalParishes
      ? `Historical parishes before 1792: ${historicalParishes}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const familyConnection =
    evaluation.investigative_verdict ||
    evaluation.factual_conclusion ||
    `The supplied ancestral place is ${trip.ancestral_place}, but the current evidence does not establish a specific family connection.`;

  const introduction =
    source.report_metadata?.research_editor_evaluation ||
    `A research-led heritage journey focused on the family clue associated with ${trip.ancestral_place}.`;

  const enrichedPlaces = places.map((item) => {
    const mapQuery = [item.name, item.location]
      .filter(Boolean)
      .join(", ");

    return {
      ...item,
      map_url: mapQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            mapQuery,
          )}`
        : undefined,
    };
  });

  return {
    map_coordinates_version: 2,
    title:
      source.report_metadata?.report_type ||
      source.title ||
      `Heritage research journey: ${
        place.modern_municipality ||
        trip.ancestral_place
      }`,
    introduction,
    family_connection:
      familyConnection,
    heritage_context:
      heritageContext ||
      `The research focuses on the historical and archival landscape of ${
        place.modern_municipality ||
        trip.ancestral_place
      }.`,
    findings,
    places: enrichedPlaces,
    itinerary,
    research_leads: researchLeads,
    practical_notes: practicalNotes,
    caveats,
    sources: [],
  };
}

async function generateHeritageReport(
  env: Env,
  trip: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    ancestral_place: string;
    birth_year: number | null;
    birth_place: string | null;
    notes: string | null;
  },
  product: keyof typeof PRODUCTS,
): Promise<HeritageReport> {
  const selected = PRODUCTS[product];
  const fallback = buildFallbackReport(trip, product);

  const customerName =
    [trip.first_name, trip.last_name]
      .filter(Boolean)
      .join(" ") || "the traveller";

  const itineraryDays =
    product === "deep" ? 5 : 3;

  const prompt = `
You are the senior research editor and heritage-travel investigator for AncestryTrip, a paid service.

Create a research-led heritage journey for a paying customer. The report must be useful even when the family connection cannot yet be proved. It must never manufacture genealogy, citations, places, images, or certainty.

CUSTOMER
Name: ${customerName}
Birth year: ${trip.birth_year || "not provided"}
Birth place: ${trip.birth_place || "not provided"}
Ancestral place: ${trip.ancestral_place}
Additional family clues: ${trip.notes || "none provided"}

PRODUCT
${selected.name}
Itinerary length: ${itineraryDays} days

CORE STANDARD

This is NOT a generic travel guide and NOT a surname essay.

The paid value comes from connecting the customer's actual clues to:
1. concrete evidence found through web research;
2. real archives, record collections, institutions and historically relevant places;
3. a clear distinction between verified facts, reasonable interpretations and unresolved leads;
4. a practical journey that lets the customer continue the investigation in person.

A report with beautiful prose but no customer-specific evidence is a failed report.

RESEARCH EXECUTION PROTOCOL

Work in this order. Do not jump straight to tourist attractions.

PHASE 1 — RESOLVE THE GEOGRAPHY
Establish the exact modern place supplied by the customer and its relevant historical geography:
- municipality/town/village;
- region, county/department/province and country;
- historical names and spellings;
- historical jurisdictions that affect where records are held;
- relevant parish/commune/district names;
- boundary or jurisdiction changes that could explain why records may be elsewhere.

Use authoritative geographic, municipal, archival or institutional sources where available.

PHASE 2 — EXTRACT THE FAMILY TARGET
Treat every supplied clue as potentially important:
- surname and exact spelling;
- given name;
- birth year/date;
- birth place;
- ancestral place;
- occupation;
- religion;
- migration;
- named relatives;
- military or immigration details;
- anything else concrete in the customer's notes.

Do not invent missing facts. Do not silently "correct" a surname.

PHASE 3 — SEARCH THE FAMILY CLUE FIRST
Use Google Search deliberately. Run multiple focused searches rather than relying on one query.

At minimum, consider:
- exact surname + ancestral place;
- exact surname + historical jurisdiction;
- exact surname + genealogy;
- exact surname + parish/church;
- exact surname + civil registration;
- exact surname + census;
- exact surname + military;
- exact surname + cemetery;
- exact surname + archive;
- exact surname + occupation or other supplied clue.

Then follow promising results with narrower searches for the named person, institution, parish, record collection, street, cemetery, workplace or historical event.

Search the relevant country in its local terminology where useful, but do not assume France or Europe. AncestryTrip serves customers worldwide.

Do not manufacture surname variants. Only use a variant when a consulted source, historical spelling, indexing convention, transliteration or other concrete evidence justifies it.

PHASE 4 — EVALUATE EACH RESULT
For every potentially important result, ask:
- Does it actually mention the customer's clue?
- Does it concern the right place or historical jurisdiction?
- What exact fact does it establish?
- Is it a primary source, official institutional source, reputable secondary source, genealogy database, or merely a lead?
- Does it establish something about this customer's family, or only about people/place history generally?
- What would confirm or disprove the connection?

Do not treat search-engine snippets as evidence when the underlying page does not support the claim.

PHASE 5 — BUILD AN EVIDENCE CHAIN
For every important family-specific finding, internally establish:

CUSTOMER CLUE
→ SEARCH/RESEARCH PATH
→ SPECIFIC SOURCE OR RECORD
→ FACT ACTUALLY ESTABLISHED
→ RELEVANCE TO THIS FAMILY

If the chain is incomplete, do not present the conclusion as verified.

Use confidence exactly:
- "verified": directly supported by a consulted source or record;
- "probable": supported by multiple relevant clues but not conclusively established;
- "lead": useful unresolved possibility or next research direction.

Never upgrade a lead merely because it sounds plausible.

PHASE 6 — HANDLE NEGATIVE RESULTS
Negative research is valuable.

If searches do not find a direct reference to the customer's family, explicitly say that no direct family-specific result was located in the searched material.

Then explain what was established instead and identify the most useful next records to inspect.

Never manufacture a family connection from:
- surname frequency;
- a famous person with the same surname;
- a general town-history page;
- a church merely because it is old;
- a cemetery merely because it exists;
- a local occupation;
- an unrelated genealogy-tree entry;
- an attractive tourist site.

PHASE 7 — RESEARCH THE HERITAGE LANDSCAPE
Only after the family clue has been investigated, identify the local places that help interpret or continue the investigation.

Prioritize:
- national/regional/municipal archives;
- civil-registration authorities;
- diocesan/parish/religious archives;
- museums and heritage institutions;
- libraries and universities;
- established historical societies;
- official municipal or tourism institutions;
- cemeteries, churches, neighbourhoods, ports, stations, workplaces or landmarks when they have a specific research connection.

For every place, explain the investigative role. Prefer 5–8 genuinely relevant places. Do not pad the list.

PHASE 8 — RESEARCH-LED ITINERARY
Build the itinerary from the evidence, not from generic sightseeing.

Every day must have:
- a specific research/heritage objective;
- named places from the report;
- a concrete action;
- the evidence or question that action advances.

The sequence should progress logically:
- establish the geographic/historical setting;
- investigate the strongest family/research trail;
- visit the most relevant institutions/places;
- reserve time for unresolved records and verification;
- finish with a concrete synthesis or next-step activity.

Do not repeat "walk around the historic centre" or similar generic activities.

PHASE 9 — SOURCES
Sources are part of the product, not decoration.

Include only real webpages actually consulted during the research. Prefer primary and authoritative sources.

For each important finding, use sources that support the exact claim. Do not cite a homepage merely because it belongs to an institution mentioned elsewhere.

Never invent URLs. Never put a guessed URL into the JSON.

PHASE 10 — IMAGES
Actively look for 2–4 useful, research-specific images on consulted pages when available:
- archives;
- museums;
- churches;
- cemeteries;
- historic streets;
- ports/stations;
- historic maps;
- municipal or heritage collections.

Use only direct image URLs actually exposed by a consulted webpage, paired with that page's URL. Never guess an image filename and never use generic stock photography to fill the field.

QUALITY GATES BEFORE OUTPUT

Before returning JSON, silently audit the report:

1. FAMILY-SPECIFIC VALUE
At least one finding must directly address the customer's family clue OR explicitly state that no direct family-specific result was found.

2. EVIDENCE DISCIPLINE
Every "verified" finding must have concrete supporting evidence. Every "probable" conclusion must make its uncertainty clear. Unresolved material must be a "lead".

3. RESEARCH ACTIONABILITY
Research leads must name an actual institution, collection, database, record type, jurisdiction or other concrete resource and a specific question to investigate.

4. PLACE RELEVANCE
Every place must have a specific role in the family investigation or in interpreting an established historical fact. Remove generic attractions.

5. ITINERARY INTEGRITY
Every itinerary day must connect to named places, findings or research leads. Each day must advance the investigation.

6. SOURCE INTEGRITY
Only use URLs actually surfaced by the research. Do not invent, guess or normalize an unverified URL into existence.

7. HONEST LIMITATIONS
If the evidence is thin, say so. A smaller report with honest research is better than a longer report padded with generic material.

8. CUSTOMER VALUE
The customer should finish knowing:
- what has actually been established;
- what remains uncertain;
- where to go;
- what to ask for;
- what records to inspect;
- what question each visit is intended to answer.

OUTPUT FORMAT

Return exactly one JSON object with these top-level fields and no others:

{
  "title": "A specific report title for this family investigation",
  "introduction": "A concise introduction explaining what was investigated and what the report can establish.",
  "family_connection": "What the research establishes about the customer's family connection. Clearly state when the connection is unproven.",
  "heritage_context": "Relevant historical, geographic and archival context for the ancestral place.",
  "findings": [
    {
      "finding": "A specific research finding",
      "evidence": "The evidence supporting that finding, including the source or record consulted where available.",
      "relevance": "Why this finding matters to the customer's family investigation.",
      "confidence": "verified"
    }
  ],
  "places": [
    {
      "name": "Specific place, archive, institution, church, cemetery, district or landmark",
      "location": "Specific address or location",
      "why_it_matters": "Why this place matters to the family investigation.",
      "what_to_see": "What the traveller should see, request, inspect or investigate there.",
      "category": "Origin | Archive | Church | Cemetery | Museum | Historic district | Landmark | Other",
      "research_role": "The specific role this place plays in the investigation."
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "title": "Specific day theme",
      "plan": "Detailed research-led itinerary for this day, including locations, actions and evidence to investigate."
    }
  ],
  "research_leads": [
    {
      "lead": "A specific unresolved research question or lead",
      "where_to_look": "The actual archive, institution, database or resource to use.",
      "what_to_search": "The specific person, surname, record type, date range or question to investigate."
    }
  ],
  "practical_notes": [
    "Specific practical information useful to the traveller."
  ],
    "caveats": [
    "Important limitations, uncertainty or unverified connections."
  ],
  "sources": [
    {
      "title": "The title of the source",
      "url": "https://example.com"
    }
  ],
  "images": [
    {
      "url": "https://example.com/real-image.jpg",
      "title": "A concise description of the place shown",
      "source_url": "https://example.com/page-about-the-place"
    }
  ]
}

FIELD RULES

- Use exactly these top-level field names.
- "sources" must be an array of the most important sources actually consulted during the research.
- "images" must be an array containing 2-4 representative images whenever the research pages expose usable images; do not leave it empty merely because the page is not itself an image file.
- Actively look for visual material while researching: official archive photographs, museum collections, heritage pages, municipal history pages, historic maps, churches, cemeteries, streets, ports, stations and landscapes that are directly relevant to the report.
- Never invent an image URL. Only use a direct image URL actually present on a consulted webpage, such as an og:image, twitter:image, gallery image or image asset linked from that page, and pair it with the exact webpage URL in "source_url".
- Provide a distinct image for every place in the "places" list whenever a real image can be found.
- Each place image must visibly represent that exact named location, not merely the town, region, coastline or a generic category.
- Prefer high-resolution images from official archive, museum, heritage, municipal, library, tourism or established institutional pages. Avoid thumbnails, tiny preview images, map tiles, logos and generic stock photography.
- The image should be suitable for a large web card: prefer at least roughly 1000px wide and a source image that is not visibly compressed or pixelated.
- If a real image clearly depicts a specific place in the "places" list, include the direct image URL as "image_url" on that place as well as including the webpage in "source_url". Never guess an image URL.
- Do not reuse the same image URL for two different places.
- If no suitable image exists for a particular place, omit the image rather than using an unrelated or generic photograph.
- Keep image URLs separate from "sources"; sources remain normal webpages.
- Each source must contain exactly "title" and "url".
- Use real URLs from the research results.
- Do not invent, guess or fabricate URLs.
- Prefer primary sources such as archives, government records, churches, libraries, museums and official institutional websites.
- Include only sources that materially support the findings or research leads.
- Do not wrap the object inside another property such as "heritage_report", "report", "client_dossier", "customer_profile" or "geographic_resolution".
- Do not create alternative field names.
- Do not omit any of the top-level fields. Use an empty array when a list genuinely has no entries, including "sources".
- "confidence" must be exactly one of: "verified", "probable", "lead".
- A "verified" finding must be directly supported by the research evidence.
- Use "probable" only when the evidence supports a reasonable but not fully established conclusion.
- Use "lead" for unresolved possibilities or research directions.
- Never invent a family relationship merely because a person has the same or similar surname.
- Keep the distinction between established evidence, probable interpretation and research lead explicit.
- Include actual institutions, places and record types wherever the research supports them.
- For every place, set "category" to one concise useful type and "research_role" to the specific investigative role of that place.
- Order places in the sequence that makes sense for the investigation, starting with the strongest geographic/family anchor and then following the research trail.
- Do not provide latitude, longitude, or other invented geographic coordinates.
- The itinerary must be based on the research findings and places, not generic tourism advice.
- Each itinerary day must connect to at least one finding, place, or research lead from the report.
- Avoid repeating the same generic activity across multiple days. Each day should advance the investigation.
- Every source must contain both "title" and "url".
- Every "url" must be a complete HTTP or HTTPS webpage URL.
- Do not use URLs ending in image or media file extensions such as .jpg, .jpeg, .png, .gif, .webp or .pdf.
- Do not use direct image links, screenshots, logos, maps or other media files as sources.
- Do not include a source unless you have a real URL for it.
- Never create a source with a missing or empty URL.
- Do not duplicate the same URL.
- Prefer the official webpage for an institution or archive rather than a deep link to an image or asset.
- Sources must be webpages that support the research in this report, not merely names of institutions mentioned in the itinerary.

Return JSON only.
Do not use markdown fences.


`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        input: prompt,
        tools: [
          {
            type: "google_search",
          },
        ],
      }),
    },
  );

  const data = (await response.json()) as {
    error?: {
      message?: string;
    };
    steps?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
        annotations?: Array<{
          url?: string;
          title?: string;
        }>;
      }>;
    }>;
  };

  if (!response.ok) {
    console.error(
      "Gemini interaction error:",
      data.error,
    );
    return fallback;
  }

  const modelOutputs =
    data.steps?.filter(
      (step) => step.type === "model_output",
    ) || [];
  const lastModelOutput =
    modelOutputs[modelOutputs.length - 1];

  const modelText =
    lastModelOutput?.content
      ?.filter(
        (item) => item.type === "text" && item.text,
      )
      .map((item) => item.text || "")
      .join("")
      .trim() || "";

  if (!modelText) {
    console.error(
      "Gemini returned no model output.",
    );
    return fallback;
  }

  const annotatedSources: ReportSource[] = [];
  const annotatedSourceUrls = new Set<string>();

  for (const step of modelOutputs) {
    for (const item of step.content || []) {
      for (const annotation of item.annotations || []) {
        const title = annotation.title?.trim();
        const url = annotation.url?.trim();

        if (
          !title ||
          !url ||
          !/^https?:\/\//i.test(url) ||
          annotatedSourceUrls.has(url)
        ) {
          continue;
        }

        let parsedUrl: URL;

        try {
          parsedUrl = new URL(url);
        } catch {
          continue;
        }

        if (
          parsedUrl.hostname
            .toLowerCase()
            .endsWith("vertexaisearch.cloud.google.com")
        ) {
          continue;
        }

        if (
          /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|pdf)(?:[?#].*)?$/i.test(
            parsedUrl.pathname,
          )
        ) {
          continue;
        }

        annotatedSourceUrls.add(url);
        annotatedSources.push({ title, url });

        if (annotatedSources.length >= 12) {
          break;
        }
      }

      if (annotatedSources.length >= 12) {
        break;
      }
    }

    if (annotatedSources.length >= 12) {
      break;
    }
  }



  let rawReport: unknown;

  try {
    rawReport = JSON.parse(modelText);
  } catch (error) {
    console.error(
      "Could not parse Gemini interaction JSON:",
      error,
    );
    console.error(
      "Raw Gemini model text:",
      modelText,
    );
    return fallback;
  }

  const report = normalizeHeritageReport(
    rawReport,
    trip,
  );

  // Only expose sources that Gemini actually surfaced through Google Search.
  // The model's JSON can contain plausible-looking URLs that were never consulted;
  // those must not become customer-facing citations.
  const annotatedByUrl = new Map<string, ReportSource>();

  const sourceKey = (url: string) => {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      parsed.search = "";
      parsed.pathname = parsed.pathname.replace(/\/$/, "");
      return parsed.toString();
    } catch {
      return url.trim();
    }
  };

  for (const source of annotatedSources) {
    annotatedByUrl.set(sourceKey(source.url), source);
  }

  const validSources = new Map<string, ReportSource>();

  for (const source of report.sources || []) {
    if (
      !source ||
      typeof source.title !== "string" ||
      typeof source.url !== "string"
    ) {
      continue;
    }

    const url = source.url.trim();

    if (!url || !/^https?:\/\//i.test(url)) {
      continue;
    }

    const verifiedSource =
      annotatedByUrl.get(sourceKey(url));

    if (!verifiedSource) {
      continue;
    }

    validSources.set(verifiedSource.url, verifiedSource);
  }

  // If the model omitted its own source list, use the actual search annotations.
  if (
    validSources.size === 0 &&
    annotatedSources.length > 0
  ) {
    for (const source of annotatedSources) {
      validSources.set(source.url, source);
    }
  }

  report.sources = Array.from(
    validSources.values(),
  );

  const reportWithImages = await hydrateReportImages(report);
  return await hydrateReportMapCoordinates(env, reportWithImages);
}


async function isUsableImageUrl(
  url: string,
  options: { minimumBytes?: number; minimumWidth?: number; minimumHeight?: number } = {},
) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AncestryTrip/1.0 (+https://ancestrytrip.com)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) return false;

    const minimumBytes = options.minimumBytes ?? 120000;
    const minimumWidth = options.minimumWidth ?? 900;
    const minimumHeight = options.minimumHeight ?? 600;
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 0 && contentLength < minimumBytes) return false;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < minimumBytes) return false;

    let width = 0;
    let height = 0;
    const type = contentType.toLowerCase();

    if (type.includes("png") && bytes.length >= 24) {
      width = new DataView(bytes.buffer).getUint32(16);
      height = new DataView(bytes.buffer).getUint32(20);
    } else if (type.includes("jpeg") || type.includes("jpg")) {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (
          marker >= 0xc0 &&
          marker <= 0xc3 &&
          length >= 7
        ) {
          height = (bytes[offset + 5] << 8) | bytes[offset + 6];
          width = (bytes[offset + 7] << 8) | bytes[offset + 8];
          break;
        }
        offset += 2 + length;
      }
    } else if (type.includes("webp") && bytes.length >= 30) {
      const fourcc = String.fromCharCode(
        bytes[12], bytes[13], bytes[14], bytes[15],
      );
      if (fourcc === "VP8X" && bytes.length >= 30) {
        width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
        height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      }
    }

    if (width > 0 && height > 0) {
      return width >= minimumWidth && height >= minimumHeight;
    }

    // Some CDNs do not expose a parseable image format. Byte size is still
    // a useful minimum safeguard in that case.
    return true;
  } catch {
    return false;
  }
}

async function extractOgImage(source: ReportSource) {
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "AncestryTrip/1.0 (+https://ancestrytrip.com)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = (await response.text()).slice(0, 1000000);
    const imageMatch =
      html.match(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/i,
      ) ||
      html.match(
        /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i,
      );

    if (!imageMatch?.[1]) return null;

    const imageUrl = new URL(imageMatch[1], source.url);
    if (!/^https?:$/i.test(imageUrl.protocol)) return null;

    const normalized = imageUrl.toString();

    if (!(await isUsableImageUrl(normalized))) return null;

    return normalized;
  } catch {
    return null;
  }
}

async function findFallbackPlaceImage(
  place: ReportPlace,
  usedImageUrls: Set<string>,
): Promise<string | null> {
  const name = place.name?.trim() || "";
  const location = place.location?.trim() || "";

  if (!name && !location) return null;

  const queries = Array.from(
    new Set(
      [
        [name, location].filter(Boolean).join(" "),
        name,
      ].filter(Boolean),
    ),
  );

  // Prefer exact Wikimedia Commons categories for named places. These categories
  // are especially reliable for landmarks and transport sites.
  for (const categoryName of [name]) {
    try {
      const params = new URLSearchParams({
        action: "query",
        generator: "categorymembers",
        gcmtitle: "Category:" + categoryName,
        gcmnamespace: "6",
        gcmtype: "file",
        gcmlimit: "20",
        prop: "imageinfo",
        iiprop: "url|size|mime",
        format: "json",
        origin: "*",
      });

      const response = await fetch(
        "https://commons.wikimedia.org/w/api.php?" + params.toString(),
        {
          headers: {
            "User-Agent": "AncestryTrip/1.0 (+https://ancestrytrip.com)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) continue;

      const data = (await response.json()) as {
        query?: {
          pages?: Record<string, {
            imageinfo?: Array<{ url?: string; width?: number; height?: number; mime?: string }>;
          }>;
        };
      };

      const candidates = Object.values(data.query?.pages || {})
        .flatMap((page) => {
          const info = page.imageinfo?.[0];
          return info?.url
            ? [{ url: info.url, width: Number(info.width) || 0 }]
            : [];
        })
        .filter((candidate) => /^https?:\\/\\//i.test(candidate.url) && !usedImageUrls.has(candidate.url))
        .sort((a, b) => b.width - a.width);

      for (const candidate of candidates.slice(0, 8)) {
        if (await isUsableImageUrl(candidate.url, {
          minimumBytes: 140000,
          minimumWidth: 1000,
          minimumHeight: 650,
        })) {
          return candidate.url;
        }
      }
    } catch {
      // Continue with search-based Wikimedia discovery.
    }
  }

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: "6",
        gsrlimit: "10",
        prop: "imageinfo",
        iiprop: "url|size|mime",
        format: "json",
        origin: "*",
      });

      const response = await fetch(
        "https://commons.wikimedia.org/w/api.php?" +
          params.toString(),
        {
          headers: {
            "User-Agent":
              "AncestryTrip/1.0 (+https://ancestrytrip.com)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) continue;

      const data = (await response.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              imageinfo?: Array<{
                url?: string;
                width?: number;
                height?: number;
                mime?: string;
              }>;
            }
          >;
        };
      };

      const candidates = Object.values(
        data.query?.pages || {},
      )
        .flatMap((page) => {
          const info = page.imageinfo?.[0];
          if (!info?.url) return [];

          const title = (page.title || "")
            .replace(/^File:/i, "")
            .replace(/\.[a-z0-9]+$/i, "");

          const normalizedTitle = normalizePlaceText(title);
          const normalizedName = normalizePlaceText(name);
          const normalizedLocation = normalizePlaceText(location);

          const nameTokens = placeTokens(name);
          const titleTokens = new Set(placeTokens(title));
          const nameMatches = nameTokens.filter((token) =>
            titleTokens.has(token),
          ).length;
          const nameCoverage = nameTokens.length
            ? nameMatches / nameTokens.length
            : 0;
          const locationMatches = normalizedLocation
            ? normalizedTitle.includes(normalizedLocation)
              ? 1
              : 0
            : 0;

          const exactName =
            normalizedName.length > 0 &&
            normalizedTitle.includes(normalizedName);

          return [{
            url: info.url,
            width: Number(info.width) || 0,
            height: Number(info.height) || 0,
            mime: info.mime || "",
            score:
              (exactName ? 200 : 0) +
              nameCoverage * 100 +
              locationMatches * 60 +
              Math.min(
                (Number(info.width) || 0) / 20,
                100,
              ),
          }];
        })
        .filter(
          (candidate) =>
            /^https?:\/\//i.test(candidate.url) &&
            !usedImageUrls.has(candidate.url),
        )
        .sort((a, b) => b.score - a.score);

      for (const candidate of candidates.slice(0, 5)) {
        if (
          await isUsableImageUrl(candidate.url, {
            minimumBytes: 140000,
            minimumWidth: 1000,
            minimumHeight: 650,
          })
        ) {
          return candidate.url;
        }
      }
    } catch {
      // Try the next query/source.
    }
  }

  return null;
}

async function hydrateReportImages(report: HeritageReport): Promise<HeritageReport> {
  const images: ReportImage[] = [];
  const seenImageUrls = new Set<string>();

  for (const image of Array.isArray(report.images) ? report.images : []) {
    if (images.length >= 4) break;
    if (
      !image ||
      typeof image.url !== "string" ||
      typeof image.title !== "string" ||
      typeof image.source_url !== "string" ||
      !/^https?:\/\//i.test(image.url) ||
      !/^https?:\/\//i.test(image.source_url)
    ) {
      continue;
    }

    if (!(await isUsableImageUrl(image.url, { minimumBytes: 250000, minimumWidth: 1400, minimumHeight: 800 }))) continue;
    if (seenImageUrls.has(image.url.trim())) continue;

    seenImageUrls.add(image.url.trim());
    images.push({
      url: image.url.trim(),
      title: image.title.trim(),
      source_url: image.source_url.trim(),
    });
  }

  const sources = (report.sources || []).slice(0, 12);

  for (const source of sources) {
    if (images.length >= 4) break;

    const imageUrl = await extractOgImage(source);
    if (
      !imageUrl ||
      seenImageUrls.has(imageUrl) ||
      !(await isUsableImageUrl(imageUrl, {
        minimumBytes: 250000,
        minimumWidth: 1400,
        minimumHeight: 800,
      }))
    ) {
      continue;
    }

    seenImageUrls.add(imageUrl);
    images.push({
      url: imageUrl,
      title: source.title,
      source_url: source.url,
    });
  }

  const places: ReportPlace[] = [];
  const usedPlaceImages = new Set<string>();

  for (const place of report.places || []) {
    if (
      place.image_url &&
      /^https?:\/\//i.test(place.image_url) &&
      !usedPlaceImages.has(place.image_url) &&
      await isUsableImageUrl(place.image_url, {
        minimumBytes: 140000,
        minimumWidth: 1000,
        minimumHeight: 650,
      })
    ) {
      usedPlaceImages.add(place.image_url);
      places.push(place);
      continue;
    }

    const fallbackImageUrl = await findFallbackPlaceImage(
      place,
      usedPlaceImages,
    );

    if (fallbackImageUrl) {
      usedPlaceImages.add(fallbackImageUrl);
      places.push({
        ...place,
        image_url: fallbackImageUrl,
      });
      continue;
    }

    // Keep the original image as a last-resort visual rather than leaving
    // the location card blank. The normal image validation above remains the
    // quality gate for preferred images and the fallback search keeps trying
    // other location-specific sources first.
    if (place.image_url && /^https?:\/\//i.test(place.image_url)) {
      places.push(place);
    } else {
      places.push({
        ...place,
        image_url: undefined,
      });
    }
  }

  return {
    ...report,
    places,
    images,
    image_hydration_version: 2,
  };
}

function normalizePlaceText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function placeTokens(value: string) {
  return normalizePlaceText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

async function geocodeReportPlace(
  apiKey: string,
  place: ReportPlace,
) {
  const name = place.name?.trim() || "";
  const location = place.location?.trim() || "";

  if (!apiKey || (!name && !location)) return null;

  // Report place names are sometimes editorial titles rather than the
  // literal name used by the map data. For example:
  // "Bassin Bouvet and the Historic Port Quays of Saint-Servan"
  // should first be searched as "Bassin Bouvet".
  const nameCandidates = Array.from(
    new Set(
      [
        name,
        name.split(/\s+(?:and|&)\s+/i)[0]?.trim(),
        name.split(/[[:space:]]+[-–—:][[:space:]]+/)[0]?.trim(),
      ].filter(
        (value): value is string =>
          typeof value === "string" &&
          value.length >= 3,
      ),
    ),
  );

  // Resolve the report locality globally first. This gives us the
  // country code without assuming the report is European or French.
  let countryCode = "";
  let locationFallback: { latitude: number; longitude: number } | null = null;

  if (location) {
    try {
      const locationParams = new URLSearchParams({
        text: location,
        type: "city",
        limit: "10",
        format: "json",
        lang: "en",
        apiKey,
      });

      const locationResponse = await fetch(
        "https://api.geoapify.com/v1/geocode/search?" +
          locationParams.toString(),
        {
          headers: {
            "User-Agent": "AncestryTrip/1.0 (+https://ancestrytrip.com)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (locationResponse.ok) {
        const locationData = (await locationResponse.json()) as {
          results?: Array<{
            city?: string;
            country_code?: string;
            lat?: number;
            lon?: number;
            formatted?: string;
          }>;
        };

        const normalizedLocation = normalizePlaceText(location);
        const locationResult = (locationData.results || []).find((result) => {
          const resultText = normalizePlaceText(
            [result.city, result.formatted].filter(Boolean).join(", "),
          );
          const locationParts = placeTokens(normalizedLocation);
          return (
            !!result.country_code &&
            locationParts.length > 0 &&
            locationParts.some((token) => resultText.includes(token))
          );
        });

        countryCode = locationResult?.country_code?.toLowerCase() || "";
        if (locationResult) {
          locationFallback = {
            latitude: Number(locationResult.lat),
            longitude: Number(locationResult.lon),
          };
        }
      }
    } catch {
      // Continue with an unrestricted worldwide search if country resolution
      // is unavailable.
    }
  }

  const queries: Array<{ text: string; type?: string }> = [
    // Constrain named places by their supplied locality first. If the report
    // country was resolved, the country filter makes duplicate names elsewhere
    // in the world ineligible.
    ...nameCandidates.map((candidate) => ({
      text: [candidate, location].filter(Boolean).join(", "),
    })),
    // Then try the literal name as a discovery fallback, but an exact-name
    // result is only accepted if it also matches the supplied locality below.
    ...nameCandidates.map((candidate) => ({
      text: candidate,
    })),
    {
      text: location,
      type: "city",
    },
  ];

  for (const query of queries) {
    if (!query.text) continue;

    try {
      const params = new URLSearchParams({
        text: query.text,
        limit: "10",
        format: "json",
        lang: "en",
        apiKey,
      });

      if (countryCode) {
        params.set("filter", "countrycode:" + countryCode);
      }

      if (query.type) {
        params.set("type", query.type);
      }

      const response = await fetch(
        "https://api.geoapify.com/v1/geocode/search?" + params.toString(),
        {
          headers: {
            "User-Agent": "AncestryTrip/1.0 (+https://ancestrytrip.com)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) continue;

      const data = (await response.json()) as {
        results?: Array<{
          lat?: number;
          lon?: number;
          name?: string;
          formatted?: string;
          address_line1?: string;
          city?: string;
          county?: string;
          state?: string;
          country?: string;
          categories?: string[];
          result_type?: string;
          rank?: {
            confidence?: number;
          };
        }>;
      };

      let best:
        | {
            latitude: number;
            longitude: number;
            score: number;
            exactName: boolean;
            resultName: string;
            formatted: string;
            resultType: string;
            confidence: number;
            locationMatches: number;
          }
        | null = null;

      const candidateName =
        nameCandidates.find((candidate) =>
          normalizePlaceText(query.text).startsWith(
            normalizePlaceText(candidate),
          ),
        ) || name;

      const candidateTokens = placeTokens(candidateName);
      // Country is already constrained by Geoapify's filter. For locality
      // validation, use complete comma-separated phrases rather than isolated
      // words, so "Saint" cannot falsely match an unrelated "Saint-Vincent".
      const locationPhrases = location
        .split(",")
        .map((part) => normalizePlaceText(part))
        .filter(
          (part) =>
            part.length >= 3 &&
            ![
              "france",
              "francais",
              "francaise",
            ].includes(part) &&
            !/^\d+(?:\s*\d+)?$/.test(part),
        );

      for (const result of data.results || []) {
        const latitude = Number(result?.lat);
        const longitude = Number(result?.lon);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          continue;
        }

        const resultName = normalizePlaceText(
          result.name ||
            result.address_line1 ||
            "",
        );

        const resultText = normalizePlaceText(
          [
            result.name,
            result.address_line1,
            result.formatted,
            result.city,
            result.county,
            result.state,
          ]
            .filter(Boolean)
            .join(" "),
        );

        const resultTokens = new Set(placeTokens(resultText));

        const nameMatches = candidateTokens.filter((token) =>
          resultTokens.has(token),
        ).length;

        const locationMatches = locationPhrases.filter(
          (phrase) =>
            resultText.includes(phrase),
        ).length;

        const nameCoverage = candidateTokens.length
          ? nameMatches / candidateTokens.length
          : 0;

        const locationCoverage = locationPhrases.length
          ? locationMatches / locationPhrases.length
          : 0;

        const exactName =
          candidateName &&
          resultName === normalizePlaceText(candidateName);

        const confidence = Number(result.rank?.confidence) || 0;

        const score =
          (exactName ? 200 : 0) +
          nameCoverage * 80 +
          locationCoverage * 30 +
          confidence * 20 +
          (result.result_type === "amenity" ||
          result.result_type === "building"
            ? 5
            : 0);

        if (
          !best ||
          score > best.score
        ) {
          best = {
            latitude,
            longitude,
            score,
            exactName: Boolean(exactName),
            resultName: result.name || result.address_line1 || "",
            formatted: result.formatted || "",
            resultType: result.result_type || "",
            confidence,
            locationMatches,
          };
        }
      }

      // Exact names are not sufficient on their own. A generic name such as
      // "Cathédrale Saint-Vincent" can exist in multiple French cities.
      // When a locality was supplied, at least one meaningful locality token
      // must also be present in the geocoder result.
      const hasLocationContext = locationPhrases.length > 0;
      const exactNameMatchesLocation =
        best?.exactName &&
        (!hasLocationContext ||
          best.locationMatches > 0);

      if (exactNameMatchesLocation) {
        return {
          latitude: best!.latitude,
          longitude: best!.longitude,
        };
      }

      // Otherwise require both strong name and location agreement.
      if (
        name &&
        best &&
        candidateTokens.length > 0 &&
        candidateTokens.length >= 2 &&
        best.locationMatches > 0 &&
        best.score >= 100
      ) {
        return {
          latitude: best.latitude,
          longitude: best.longitude,
        };
      }

      // If the place name is absent, a city/location match is sufficient.
      if (!name && best && best.score >= 40) {
        return {
          latitude: best.latitude,
          longitude: best.longitude,
        };
      }
    } catch {
      // Map enrichment is optional.
    }
  }

  return locationFallback;
}
async function hydrateReportMapCoordinates(
  env: Env,
  report: HeritageReport,
): Promise<HeritageReport> {
  const apiKey = env.GEOAPIFY_API_KEY?.trim();
  const hasPlaces =
    Array.isArray(report.places) &&
    report.places.length > 0;

  if (!hasPlaces) return report;

  const forceRegeocode = report.map_coordinates_version !== 9;

  const places = await Promise.all(
    report.places.map(async (place) => {
      const mapQuery = [place.name, place.location]
        .filter(Boolean)
        .join(", ");

      let enrichedPlace: ReportPlace = {
        ...place,
        map_url: place.map_url || (
          mapQuery
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
            : undefined
        ),
      };

      if (
        !apiKey ||
        (!forceRegeocode &&
          typeof enrichedPlace.latitude === "number" &&
          Number.isFinite(enrichedPlace.latitude) &&
          typeof enrichedPlace.longitude === "number" &&
          Number.isFinite(enrichedPlace.longitude))
      ) {
        return enrichedPlace;
      }

      const coordinates = await geocodeReportPlace(apiKey, enrichedPlace);

      return coordinates
        ? { ...enrichedPlace, ...coordinates }
        : enrichedPlace;
    }),
  );

  return {
    ...report,
    map_coordinates_version: apiKey ? 8 : report.map_coordinates_version,
    places,
  };
}

async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
) {
  const parts = signatureHeader.split(",");

  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);

    if (key === "t") {
      timestamp = value;
    }

    if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - timestampNumber);

  if (age > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["verify"],
  );

  for (const signature of signatures) {
    if (!/^[0-9a-fA-F]+$/.test(signature)) {
      continue;
    }

    const hexBytes =
      signature.match(/.{1,2}/g) || [];

    const bytes = new Uint8Array(
      hexBytes.map((byte) =>
        parseInt(byte, 16),
      ),
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      bytes,
      new TextEncoder().encode(signedPayload),
    );

    if (valid) {
      return true;
    }
  }

  return false;
}

async function createStripeCheckout(
  request: Request,
  env: Env,
  tripId: string,
  product: keyof typeof PRODUCTS,
  email: string,
) {
  const selected = PRODUCTS[product];
  const url = new URL(request.url);

  const successUrl =
    `${url.origin}/success` +
    `?session_id={CHECKOUT_SESSION_ID}` +
    `&trip_id=${encodeURIComponent(tripId)}` +
    `&product=${encodeURIComponent(product)}`;

  const cancelUrl = `${url.origin}/#preview`;

  const body = new URLSearchParams();

  body.set("mode", "payment");
  body.set("managed_payments[enabled]", "false");
  body.set("customer_email", email);
  body.set("client_reference_id", tripId);
  body.set("line_items[0][price]", selected.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("metadata[trip_id]", tripId);
  body.set("metadata[product]", product);

  const stripeResponse = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization:
          `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const stripeData = (await stripeResponse.json()) as StripeSession & {
    error?: {
      message?: string;
    };
  };

  if (!stripeResponse.ok || !stripeData.url) {
    console.error("Stripe Checkout creation failed:", stripeData);

    throw new Error(
      stripeData.error?.message ||
        "Stripe could not create the checkout session.",
    );
  }

  await env.DB.prepare(`
    INSERT INTO ancestry_payments (
      id,
      trip_id,
      stripe_session_id,
      product,
      amount_cents,
      currency,
      payment_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      crypto.randomUUID().replaceAll("-", ""),
      tripId,
      stripeData.id,
      product,
      selected.amountCents,
      "eur",
      "pending",
    )
    .run();

  return {
    checkoutUrl: stripeData.url,
    sessionId: stripeData.id,
  };
}

async function getPaidCheckout(
  env: Env,
  sessionId: string,
) {
  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: {
        Authorization:
          `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      },
    },
  );

  const session = (await stripeResponse.json()) as StripeSession & {
    error?: {
      message?: string;
    };
  };

  if (!stripeResponse.ok) {
    throw new Error(
      session.error?.message ||
        "Unable to verify the Stripe checkout session.",
    );
  }

  const payment = await env.DB.prepare(`
    SELECT
      id,
      trip_id,
      product,
      amount_cents,
      currency,
      payment_status
    FROM ancestry_payments
    WHERE stripe_session_id = ?
    LIMIT 1
  `)
    .bind(sessionId)
    .first<{
      id: string;
      trip_id: string;
      product: string;
      amount_cents: number;
      currency: string;
      payment_status: string;
    }>();

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  if (session.metadata?.trip_id !== payment.trip_id) {
    throw new Error("Payment does not match this trip.");
  }

  if (session.metadata?.product !== payment.product) {
    throw new Error("Payment product does not match.");
  }

  const isPaid =
    session.status === "complete" &&
    session.payment_status === "paid";

  if (!isPaid) {
    return {
      paid: false as const,
      status: session.payment_status || "unpaid",
      product: payment.product,
    };
  }

  if (
    session.amount_total !== payment.amount_cents ||
    session.currency?.toLowerCase() !==
      payment.currency.toLowerCase()
  ) {
    throw new Error("Payment amount or currency does not match.");
  }

  await env.DB.prepare(`
    UPDATE ancestry_payments
    SET payment_status = 'paid'
    WHERE id = ?
      AND payment_status IN ('pending', 'paid')
  `)
    .bind(payment.id)
    .run();

  return {
    paid: true as const,
    paymentId: payment.id,
    product: payment.product,
    amountCents: payment.amount_cents,
    email: session.customer_email,
    tripId: payment.trip_id,
  };
}


function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendReportReadyEmail(
  env: Env,
  paymentId: string,
  reportId: string,
  origin: string,
) {
  const claim = await env.DB.prepare(`
    UPDATE ancestry_payments
    SET email_status = 'sending',
        email_error = NULL
    WHERE id = ?
      AND payment_status = 'fulfilled'
      AND email_status IN ('pending', 'failed')
  `)
    .bind(paymentId)
    .run();

  if (!claim.meta.changes) {
    return;
  }

  try {
    const payment = await env.DB.prepare(`
      SELECT
        p.product,
        t.email,
        t.first_name,
        t.last_name
      FROM ancestry_payments p
      INNER JOIN ancestry_trips t
        ON t.id = p.trip_id
      WHERE p.id = ?
      LIMIT 1
    `)
      .bind(paymentId)
      .first<{
        product: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
      }>();

    if (!payment) {
      throw new Error("Payment record not found for email delivery.");
    }

    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const customerName =
      [payment.first_name, payment.last_name]
        .filter(Boolean)
        .join(" ") || "there";

    const reportUrl =
      `${origin}/report/${encodeURIComponent(reportId)}`;

    const productName =
      payment.product === "deep"
        ? "Deep Heritage Trip"
        : "Heritage Trip";

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `report-ready/${paymentId}`,
        },
        body: JSON.stringify({
          from:
            "AncestryTrip <onboarding@resend.dev>",
          to: [payment.email],
          subject:
            "Your AncestryTrip heritage journey is ready",
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f1f1f;max-width:640px;margin:0 auto;padding:32px 20px">
              <p style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#6f6f6f">ANCESTRYTRIP</p>
              <h1 style="font-family:Georgia,serif;font-weight:500;font-size:34px;line-height:1.15">Your heritage journey is ready.</h1>
              <p>Hello ${escapeHtml(customerName)},</p>
              <p>Your ${escapeHtml(productName)} report has been researched and is ready to read.</p>
              <p><a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#1f1f1f;color:#fff;text-decoration:none;padding:13px 20px;border-radius:4px">Open my report</a></p>
              <p style="font-size:14px;color:#666">You can return to this link whenever you want to revisit your report.</p>
              <p style="font-family:Georgia,serif">AncestryTrip<br><span style="font-family:Arial,sans-serif;font-size:14px;color:#666">Turn your family history into a journey.</span></p>
            </div>
          `,
        }),
      },
    );

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(
        `Resend rejected the email: ${resendResponse.status} ${errorText.slice(0, 500)}`,
      );
    }

    await env.DB.prepare(`
      UPDATE ancestry_payments
      SET email_status = 'sent',
          email_sent_at = CURRENT_TIMESTAMP,
          email_error = NULL
      WHERE id = ?
    `)
      .bind(paymentId)
      .run();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown email delivery error.";

    console.error("Report email delivery failed:", message);

    await env.DB.prepare(`
      UPDATE ancestry_payments
      SET email_status = 'failed',
          email_error = ?
      WHERE id = ?
        AND email_status = 'sending'
    `)
      .bind(message.slice(0, 1000), paymentId)
      .run();
  }
}

async function generateReportForPayment(
  env: Env,
  paymentId: string,
  origin: string,
) {
  const claim = await env.DB.prepare(`
    UPDATE ancestry_payments
    SET payment_status = 'generating'
    WHERE id = ?
      AND payment_status = 'paid'
  `)
    .bind(paymentId)
    .run();

  if (!claim.meta.changes) {
    return;
  }

  try {
    const payment = await env.DB.prepare(`
      SELECT
        id,
        trip_id,
        product
      FROM ancestry_payments
      WHERE id = ?
      LIMIT 1
    `)
      .bind(paymentId)
      .first<{
        id: string;
        trip_id: string;
        product: string;
      }>();

    if (!payment) {
      throw new Error("Payment record not found while generating report.");
    }

    const existingReport = await env.DB.prepare(`
      SELECT id
      FROM ancestry_reports
      WHERE payment_id = ?
      LIMIT 1
    `)
      .bind(payment.id)
      .first<{ id: string }>();

    if (existingReport) {
      await env.DB.prepare(`
        UPDATE ancestry_payments
        SET payment_status = 'fulfilled'
        WHERE id = ?
      `)
        .bind(payment.id)
        .run();

      await sendReportReadyEmail(
        env,
        payment.id,
        existingReport.id,
        origin,
      );
      return;
    }

    const trip = await env.DB.prepare(`
      SELECT
        first_name,
        last_name,
        email,
        ancestral_place,
        birth_year,
        birth_place,
        notes
      FROM ancestry_trips
      WHERE id = ?
      LIMIT 1
    `)
      .bind(payment.trip_id)
      .first<{
        first_name: string | null;
        last_name: string | null;
        email: string;
        ancestral_place: string;
        birth_year: number | null;
        birth_place: string | null;
        notes: string | null;
      }>();

    if (!trip) {
      throw new Error("Trip record not found.");
    }

    const product =
      payment.product === "deep"
        ? "deep"
        : "heritage";

    const report = await generateHeritageReport(
      env,
      trip,
      product,
    );

    const reportId = crypto.randomUUID().replaceAll("-", "");

    await env.DB.prepare(`
      INSERT OR IGNORE INTO ancestry_reports (
        id,
        trip_id,
        payment_id,
        content_json
      )
      VALUES (?, ?, ?, ?)
    `)
      .bind(
        reportId,
        payment.trip_id,
        payment.id,
        JSON.stringify(report),
      )
      .run();

    await env.DB.prepare(`
      UPDATE ancestry_payments
      SET payment_status = 'fulfilled'
      WHERE id = ?
    `)
      .bind(payment.id)
      .run();

    const storedReport = await env.DB.prepare(`
      SELECT id
      FROM ancestry_reports
      WHERE payment_id = ?
      LIMIT 1
    `)
      .bind(payment.id)
      .first<{ id: string }>();

    if (!storedReport) {
      throw new Error("Report was not stored after generation.");
    }

    await sendReportReadyEmail(
      env,
      payment.id,
      storedReport.id,
      origin,
    );
  } catch (error) {
    console.error(
      "Background report generation failed:",
      error,
    );

    await env.DB.prepare(`
      UPDATE ancestry_payments
      SET payment_status = 'paid'
      WHERE id = ?
        AND payment_status = 'generating'
    `)
      .bind(paymentId)
      .run();
  }
}

async function verifyStripeCheckout(
  env: Env,
  sessionId: string,
  ctx: ExecutionContext,
  origin: string,
) {
  const checkout = await getPaidCheckout(
    env,
    sessionId,
  );

  if (!checkout.paid) {
    return checkout;
  }

  const existingReport = await env.DB.prepare(`
    SELECT id, content_json
    FROM ancestry_reports
    WHERE payment_id = ?
    LIMIT 1
  `)
    .bind(checkout.paymentId)
    .first<{
      id: string;
      content_json: string;
    }>();

  if (existingReport) {
    await env.DB.prepare(`
      UPDATE ancestry_payments
      SET payment_status = 'fulfilled'
      WHERE id = ?
    `)
      .bind(checkout.paymentId)
      .run();

    await sendReportReadyEmail(
      env,
      checkout.paymentId,
      existingReport.id,
      origin,
    );

    return {
      ...checkout,
      reportId: existingReport.id,
      report: JSON.parse(existingReport.content_json),
      reportStatus: "ready",
    };
  }

  ctx.waitUntil(
    generateReportForPayment(
      env,
      checkout.paymentId,
      origin,
    ),
  );

  return {
    ...checkout,
    reportStatus: "generating",
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname === "/api/") {
      return json({
        name: "AncestryTrip",
        status: "online",
      });
    }

    if (url.pathname === "/api/health") {
      const result = await env.DB
        .prepare("SELECT 1 AS ok")
        .first<{ ok: number }>();

      return json({
        status:
          result?.ok === 1 ? "healthy" : "degraded",
        database: result?.ok === 1,
      });
    }

    if (
      url.pathname === "/api/preview" &&
      request.method === "POST"
    ) {
      let input: TripInput;

      try {
        input = (await request.json()) as TripInput;
      } catch {
        return json(
          { error: "Invalid JSON request." },
          400,
        );
      }

      if (!input.email?.trim()) {
        return json(
          { error: "Email is required." },
          400,
        );
      }

      if (!input.ancestralPlace?.trim()) {
        return json(
          { error: "An ancestral place is required." },
          400,
        );
      }

      const tripId = crypto
        .randomUUID()
        .replaceAll("-", "");

      const preview = buildPreview(input);

      await env.DB.prepare(`
        INSERT INTO ancestry_trips (
          id,
          email,
          first_name,
          last_name,
          birth_year,
          birth_place,
          ancestral_place,
          notes,
          preview_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          tripId,
          input.email.trim(),
          input.firstName?.trim() || null,
          input.lastName?.trim() || null,
          input.birthYear || null,
          input.birthPlace?.trim() || null,
          input.ancestralPlace.trim(),
          input.notes?.trim() || null,
          JSON.stringify(preview),
        )
        .run();

      return json({
        tripId,
        preview,
      });
    }

    if (
      url.pathname === "/api/stripe/webhook" &&
      request.method === "POST"
    ) {
      const signature = request.headers.get("Stripe-Signature");

      if (!signature) {
        return json(
          { error: "Missing Stripe-Signature header." },
          400,
        );
      }

      const payload = await request.text();

      const validSignature =
        await verifyStripeWebhookSignature(
          payload,
          signature,
          env.STRIPE_WEBHOOK_SECRET,
        );

      if (!validSignature) {
        return json(
          { error: "Invalid webhook signature." },
          400,
        );
      }

      let event: {
        type: string;
        data?: {
          object?: {
            id?: string;
          };
        };
      };

      try {
        event = JSON.parse(payload);
      } catch {
        return json(
          { error: "Invalid webhook payload." },
          400,
        );
      }

      const supportedEvents = [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ];

      if (!supportedEvents.includes(event.type)) {
        return json({ received: true });
      }

      const sessionId = event.data?.object?.id;

      if (!sessionId) {
        return json(
          { error: "Webhook event has no Checkout Session ID." },
          400,
        );
      }

      try {
        const checkout = await getPaidCheckout(env, sessionId);

        if (checkout.paid) {
          ctx.waitUntil(
            generateReportForPayment(
              env,
              checkout.paymentId,
              url.origin,
            ),
          );
        }

        return json({ received: true });
      } catch (error) {
        console.error(
          "Webhook fulfillment error:",
          error,
        );

        return json(
          { error: "Fulfillment failed." },
          500,
        );
      }
    }

    if (
      url.pathname === "/api/checkout" &&
      request.method === "POST"
    ) {
      let input: CheckoutRequest;

      try {
        input = (await request.json()) as CheckoutRequest;
      } catch {
        return json(
          { error: "Invalid JSON request." },
          400,
        );
      }

      if (!input.tripId) {
        return json(
          { error: "Trip ID is required." },
          400,
        );
      }

      if (!PRODUCTS[input.product]) {
        return json(
          { error: "Invalid product." },
          400,
        );
      }

      const trip = await env.DB.prepare(`
        SELECT id, email
        FROM ancestry_trips
        WHERE id = ?
        LIMIT 1
      `)
        .bind(input.tripId)
        .first<{
          id: string;
          email: string;
        }>();

      if (!trip) {
        return json(
          { error: "Trip not found." },
          404,
        );
      }

      try {
        const checkout =
          await createStripeCheckout(
            request,
            env,
            trip.id,
            input.product,
            trip.email,
          );

        return json(checkout);
      } catch (error) {
        console.error("Checkout error:", error);

        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Unable to start checkout.",
          },
          502,
        );
      }
    }

    if (
      url.pathname.startsWith("/api/reports/") &&
      request.method === "GET"
    ) {
      const reportId = url.pathname.slice("/api/reports/".length);

      if (!/^[a-f0-9-]{32,36}$/i.test(reportId)) {
        return json({ error: "Invalid report ID." }, 400);
      }

      const report = await env.DB.prepare(`
        SELECT
          r.id,
          r.content_json,
          p.product,
          p.amount_cents,
          p.payment_status
        FROM ancestry_reports r
        INNER JOIN ancestry_payments p
          ON p.id = r.payment_id
        WHERE r.id = ?
        LIMIT 1
      `)
        .bind(reportId)
        .first<{
          id: string;
          content_json: string;
          product: string;
          amount_cents: number;
          payment_status: string;
        }>();

      if (!report || report.payment_status !== "fulfilled") {
        return json({ error: "Report not found." }, 404);
      }

      let reportContent: HeritageReport;

      try {
        reportContent = JSON.parse(report.content_json) as HeritageReport;
      } catch {
        return json({ error: "Stored report is invalid." }, 500);
      }

      // Older reports may have been generated before map coordinates were stored.
      // Enrich them once on first view; later marker clicks use the stored coordinates.
      try {
        const enrichedReport = await hydrateReportMapCoordinates(env, reportContent);

        if (
      JSON.stringify(enrichedReport.places) !== JSON.stringify(reportContent.places) ||
      enrichedReport.map_coordinates_version !== reportContent.map_coordinates_version
    ) {
          reportContent = enrichedReport;

          await env.DB.prepare(`
            UPDATE ancestry_reports
            SET content_json = ?
            WHERE id = ?
          `)
            .bind(JSON.stringify(reportContent), reportId)
            .run();
        }
      } catch {
        // The report remains usable if map enrichment is temporarily unavailable.
      }

      // Recheck imagery when the image pipeline version is old or any place
      // still lacks an image. This upgrades existing reports as the search improves.
      const needsImageHydration =
        reportContent.image_hydration_version !== 2 ||
        reportContent.places.some((place) => !place.image_url);

      if (needsImageHydration) {
        try {
          reportContent = await hydrateReportImages(reportContent);

          await env.DB.prepare(`
            UPDATE ancestry_reports
            SET content_json = ?
            WHERE id = ?
          `)
            .bind(JSON.stringify(reportContent), reportId)
            .run();
        } catch {
          // The report itself remains available if image enrichment fails.
        }
      }

      return json({
        reportId: report.id,
        report: reportContent,
        product: report.product,
        amountCents: report.amount_cents,
      });
    }

    if (
      url.pathname === "/api/checkout/verify" &&
      request.method === "GET"
    ) {
      const sessionId =
        url.searchParams.get("session_id");

      if (!sessionId) {
        return json(
          {
            error:
              "Stripe session ID is required.",
          },
          400,
        );
      }

      try {
        const result =
          await verifyStripeCheckout(
            env,
            sessionId,
            ctx,
            url.origin,
          );

        return json(result);
      } catch (error) {
        console.error(
          "Payment verification error:",
          error,
        );

        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Unable to verify payment.",
          },
          400,
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;