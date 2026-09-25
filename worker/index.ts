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

  return {
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
    places,
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
You are the senior research editor for AncestryTrip, a premium heritage-travel service.

Create a genuinely useful, location-specific heritage travel report for a paying customer.

CUSTOMER
Name: ${customerName}
Birth year: ${trip.birth_year || "not provided"}
Birth place: ${trip.birth_place || "not provided"}
Ancestral place: ${trip.ancestral_place}
Additional family clues: ${trip.notes || "none provided"}

PRODUCT
${selected.name}
Itinerary length: ${itineraryDays} days

YOUR JOB

Research the ancestral place using Google Search and turn the results into a practical heritage journey.

The report must feel substantially more valuable than a generic travel guide.

RESEARCH REQUIREMENTS

You are doing an investigation, not writing a destination guide.

A. RESOLVE THE PLACE

Establish exactly what geographic place the customer supplied:
- modern municipality, town or village;
- department/county/region;
- historical names or spellings where relevant;
- historical jurisdictions that could affect where records are held;
- relevant parish or commune names.

Do not assume that the modern place name is the historical administrative unit in which the family's records were created.

B. DEFINE THE FAMILY RESEARCH TARGET

Extract every usable clue supplied by the customer:
- family name;
- plausible surname spelling only when supported by evidence;
- birth year or approximate period;
- birth place;
- ancestral place;
- occupations;
- religion;
- migration information;
- named relatives;
- other concrete family clues.

Treat the family name and other personal clues as the primary research target.

C. SEARCH THE FAMILY CLUE FIRST

Use Google Search to investigate the actual family clue together with the ancestral place.

Run several focused searches where appropriate:
- exact family-name + place;
- family-name + department/region;
- family-name + genealogy;
- family-name + parish;
- family-name + civil registration;
- family-name + census;
- family-name + military;
- family-name + cemetery;
- family-name + archive;
- family-name + historical directory;
- family-name + relevant institution or occupation.

Do not invent surname variants merely because they look linguistically similar. Use a variant only when there is a credible reason for it.

D. EVALUATE THE EVIDENCE

For each potentially useful result, determine:

1. Does the source actually mention the customer's family clue?
2. Does it concern the ancestral place or its historical jurisdiction?
3. What exact fact does the source establish?
4. Is the source authoritative, secondary, or merely a research lead?
5. Does the evidence concern this customer's family, or only the place in general?
6. What further record would confirm or disprove the connection?

A general page about the town is not evidence that the customer's family lived there.

A genealogy website mentioning the surname is not proof that it is the customer's family.

A historical occupation in the town is not evidence that the customer or ancestor had that occupation.

E. BUILD AN EVIDENCE CHAIN

Before presenting an important finding, establish:

CUSTOMER CLUE
->
SEARCH QUERY
->
SPECIFIC SOURCE OR RECORD
->
FACT ESTABLISHED BY THAT SOURCE
->
WHY THAT FACT MATTERS TO THIS FAMILY RESEARCH

If one of these links is missing, downgrade the statement to a research lead or omit it.

F. ONLY THEN RESEARCH THE HERITAGE LANDSCAPE

After investigating the family clue, research the local historical landscape needed to interpret the evidence.

Prioritize:
- municipal and regional government sources;
- national, regional, diocesan or municipal archives;
- museums and heritage institutions;
- established historical societies;
- official tourism organizations;
- universities and libraries.

Use broader local history only when it helps explain:
- a confirmed or probable family connection;
- where relevant records are held;
- why a particular place matters to the investigation;
- what the traveller can physically see that helps interpret the family history.

G. HANDLE NEGATIVE RESULTS HONESTLY

If the searches do not produce a concrete reference to the customer's family clue, say so clearly.

Do not manufacture a family connection from:
- the existence of the surname in a region;
- a famous family with the same surname;
- generic town history;
- a local occupation;
- an old church, cemetery or building;
- a genealogy website that cannot connect the person to the customer.

A negative result is useful information when it identifies what has and has not yet been established.

H. PRIORITIZE RESEARCH VALUE OVER TOURISM VALUE

Every proposed place should answer at least one of these questions:

- Could it contain or provide access to records relevant to the family clue?
- Does it help explain a fact established by the research?
- Does it correspond to a historically relevant parish, neighbourhood, institution, cemetery or workplace?
- Does it give the traveller a concrete way to investigate or understand the family connection?

If it does none of these things, leave it out even if it is a popular tourist attraction.

For places, prefer 5-8 genuinely relevant locations rather than padding the list.

I. PLAN THE JOURNEY FROM THE EVIDENCE

The itinerary must follow the research trail discovered above.

Do not create a generic sightseeing itinerary and then add archives to it.

Each day should have:
- a clear research or heritage objective;
- specific places connected to that objective;
- a concrete action the traveller can take;
- a reason that action matters to the family investigation.

Day 1 should establish the historical and geographic landscape relevant to the clue.

Later days should progressively follow the family/research trail.

The final day should have a concrete research or heritage purpose.

J. FINAL EVIDENCE CHECK

Before returning the report, review every important claim.

For each claim ask:

"What source supports this exact statement?"

If there is no supporting source or supplied customer information:
- remove the claim; or
- clearly label it as a research lead or hypothesis.

Never present an inference as a verified family fact.

QUALITY BAR

The report must feel substantially more valuable than a generic travel guide.

Do not write generic statements such as:
"Explore the historic centre."
"Visit local museums."
"Look at archives."

Instead, identify the actual place, institution, archive, church, cemetery, museum, district, landmark or other relevant resource whenever the research supports it, and explain:
- why it matters to this customer's family investigation;
- what the traveller should see or do there;
- what specific record, clue or evidence the traveller should look for.

For research leads, provide the actual institution or resource name and the specific record or question to investigate.

The report should read like expert editorial work prepared specifically for this customer's clue.

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
      "what_to_see": "What the traveller should see, request, inspect or investigate there."
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
  ]
}

FIELD RULES

- Use exactly these top-level field names.
- "sources" must be an array of the most important sources actually consulted during the research.
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
- The itinerary must be based on the research findings and places, not generic tourism advice.
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
          uri?: string;
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

  const validSources = new Map<string, ReportSource>();

  for (const source of report.sources || []) {
    if (
      !source ||
      typeof source.title !== "string" ||
      typeof source.url !== "string"
    ) {
      continue;
    }

    const title = source.title.trim();
    const url = source.url.trim();

    if (!title || !/^https?:\/\//i.test(url)) {
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

    validSources.set(url, {
      title,
      url,
    });
  }

  report.sources = Array.from(
    validSources.values(),
  );

  return report;
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

      return json({
        reportId: report.id,
        report: JSON.parse(report.content_json),
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