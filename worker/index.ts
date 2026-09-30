    // Do not leave an empty card when a source page already exposes a usable
    // visual. We use the report's consulted pages as a final evidence-backed
    // image source before accepting that no visual exists.
    let sourceImage: string | null = null;
    for (const source of report.sources || []) {
      const sourceText = normalizePlaceText([source.title, source.url].join(" "));
      const primaryPlaceName =
        place.name
          .split(/\s+(?:and|&|et)\s+/i)[0]
          ?.replace(/\s*\([^)]*\)\s*$/, "")
          .trim() || place.name;
      const placeTokensForSource = placeTokens(primaryPlaceName);
      const relevant = placeTokensForSource.length === 0
        ? false
        : placeTokensForSource.every((token) => sourceText.includes(token));

      if (!relevant) continue;

      const candidate = await extractOgImage(source);
      if (candidate && !usedPlaceImages.has(candidate)) {
        sourceImage = candidate;
        break;
      }
    }

    places.push({
      ...place,
      image_url: sourceImage || undefined,
    });
  }

  const placeByName = new Map(
    places.map((place) => [normalizePlaceText(place.name), place]),
  );

  const historicalComparisons = (report.historical_comparisons || [])
    .slice(0, 4)
    .map(async (comparison) => {
      const normalizedComparisonName = normalizePlaceText(comparison.place_name);
      const comparisonPrimaryName =
        comparison.place_name
          .split(/\s+(?:and|&|et)\s+/i)[0]
          ?.replace(/\s*\([^)]*\)\s*$/, "")
          .trim() || comparison.place_name;
      const normalizedComparisonPrimaryName =
        normalizePlaceText(comparisonPrimaryName);
      const exactPlace =
        placeByName.get(normalizedComparisonName) ||
        placeByName.get(normalizedComparisonPrimaryName);

      const place =
        exactPlace ||
        places.find((candidate) => {
          const candidateName = normalizePlaceText(candidate.name);
          const candidatePrimaryName =
            candidate.name
              .split(/\s+(?:and|&|et)\s+/i)[0]
              ?.replace(/\s*\([^)]*\)\s*$/, "")
              .trim() || candidate.name;
          const normalizedCandidatePrimaryName =
            normalizePlaceText(candidatePrimaryName);

          const comparisonTokens = new Set(
            placeTokens(comparisonPrimaryName),
          );
          const candidateTokens = new Set(
            placeTokens(candidatePrimaryName),
          );

          const samePrimaryName =
            normalizedComparisonPrimaryName.length >= 6 &&
            (candidateName.includes(normalizedComparisonPrimaryName) ||
              normalizedComparisonPrimaryName.includes(candidateName) ||
              normalizedCandidatePrimaryName === normalizedComparisonPrimaryName);

          const sharedTokens = Array.from(comparisonTokens).filter((token) =>
            candidateTokens.has(token),
          );

          return samePrimaryName || (
            comparisonTokens.size >= 2 &&
            sharedTokens.length === comparisonTokens.size
          );
        });

      const historicalUrl =
        typeof comparison.historical_image_url === "string" &&
        /^https?:\/\//i.test(comparison.historical_image_url)
          ? comparison.historical_image_url
          : undefined;

      const currentCandidates = [
        // Prefer imagery already proven against the matched Journey place.
        // Do not trust a report-supplied comparison URL merely because it is
        // a valid image: it may depict a different nearby landmark.
        place?.image_url,
        place?.image_fallback_url,
      ].filter(
        (url): url is string =>
          typeof url === "string" && /^https?:\/\//i.test(url),
      );

      let currentImageUrl: string | undefined;

      for (const candidate of currentCandidates) {
        if (
          await isUsableImageUrl(candidate, {
            minimumBytes: 100000,
            minimumWidth: 800,
            minimumHeight: 500,
          })
        ) {
          currentImageUrl = candidate;
          break;
        }
      }

      return {
        ...comparison,
        historical_image_url: historicalUrl,
        current_image_url: currentImageUrl,
        latitude: place?.latitude,
        longitude: place?.longitude,
      };
    })
;

  const hydratedHistoricalComparisons = (
    await Promise.all(
      historicalComparisons.map(async (comparisonPromise) => {
        const comparison = await comparisonPromise;

        if (
          comparison.historical_image_url &&
          comparison.current_image_url
        ) {
          return comparison;
        }

        // A comparison can name a specific landmark that does not map cleanly
        // to a place-card title. Search the report's researched webpages before
        // falling back to Wikimedia. Small quays and basins are often shown on
        // local-history or institutional pages without the landmark in the
        // image filename.
        if (!comparison.current_image_url) {
          const comparisonPrimaryName =
            comparison.place_name
              .split(/\s+(?:and|&|et)\s+/i)[0]
              ?.replace(/\s*\([^)]*\)\s*$/, "")
              .trim() || comparison.place_name;
          const sourceTokens = placeTokens(comparisonPrimaryName);
          const historicalSource =
            typeof comparison.historical_image_source_url === "string"
              ? comparison.historical_image_source_url
              : "";

          const relevantSources = (report.sources || [])
            .filter((source) => {
              if (
                !source ||
                typeof source.url !== "string" ||
                source.url === historicalSource
              ) {
                return false;
              }

              const sourceText = normalizePlaceText(
                [source.title, source.url].join(" "),
              );

              return (
                sourceTokens.length > 0 &&
                sourceTokens.every((token) => sourceText.includes(token))
              );
            })
            .slice(0, 6);

          for (const source of relevantSources) {
            const sourceImage = await extractOgImage(source);

            if (
              sourceImage &&
              (await isUsableImageUrl(sourceImage, {
                minimumBytes: 50000,
                minimumWidth: 640,
                minimumHeight: 400,
              }))
            ) {
              comparison.current_image_url = sourceImage;
              comparison.current_image_source_url = source.url;
              break;
            }
          }
        }

        if (!comparison.current_image_url) {
          const comparisonPlace: ReportPlace = {
            name: comparison.place_name,
            location: comparison.location,
            why_it_matters: comparison.current_description,
            what_to_see: comparison.current_description,
            latitude: comparison.latitude,
            longitude: comparison.longitude,
          };

          const comparisonImage = await findFallbackPlaceImage(
            comparisonPlace,
            new Set<string>(),
            {
              minimumBytes: 50000,
              minimumWidth: 640,
              minimumHeight: 400,
            },
          );

          if (comparisonImage) {
            usedPlaceImages.add(comparisonImage);
            comparison.current_image_url = comparisonImage;
          }
        }

        return comparison;
      }),
    )
  ).filter((comparison) => !!comparison.historical_image_url);

  return {
    ...report,
    places,
    images,
    historical_comparisons: hydratedHistoricalComparisons,
    traditions: Array.isArray(report.traditions)
      ? report.traditions.map((tradition) => ({
          ...tradition,
          image_url:
            typeof tradition.image_url === "string" &&
            /^https?:\/\//i.test(tradition.image_url)
              ? tradition.image_url
              : undefined,
          video_url:
            typeof tradition.video_url === "string" &&
            /^https?:\/\//i.test(tradition.video_url)
              ? tradition.video_url
              : undefined,
        }))
      : [],
    image_hydration_version: 9,
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

  // Last map fallback: geocode the supplied location itself without requiring
  // it to be a city. This is important for addresses such as "Bassin Bouvet,
  // Saint-Malo" where the city-only locality lookup can fail.
  if (location) {
    try {
      const fallbackParams = new URLSearchParams({
        text: location,