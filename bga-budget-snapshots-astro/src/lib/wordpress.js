import fallbackCityClerk from '../data/city-clerk-fallback.json';

const DEFAULT_ENDPOINT = 'https://www.bettergov.org/graphql';

const CORE_FIELDS = `
  databaseId
  title
  slug
  date
  modified
  content
  excerpt
  uri
  author {
    node {
      name
      uri
      description
      avatar {
        url
      }
    }
  }
  featuredImage {
    node {
      sourceUrl
      altText
      caption
      mediaDetails {
        width
        height
      }
    }
  }
  categories {
    nodes {
      name
      slug
    }
  }
  tags {
    nodes {
      name
      slug
    }
  }
`;

const SEO_FIELDS = `
  seo {
    title
    metaDesc
    canonical
    metaRobotsNoindex
    metaRobotsNofollow
    opengraphTitle
    opengraphDescription
    opengraphUrl
    opengraphSiteName
    opengraphPublishedTime
    opengraphModifiedTime
    opengraphImage {
      sourceUrl
      altText
    }
    twitterTitle
    twitterDescription
    twitterImage {
      sourceUrl
      altText
    }
    schema {
      raw
    }
  }
`;

const QUERY_WITH_SEO = `
  query BudgetSnapshot($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ${CORE_FIELDS}
      ${SEO_FIELDS}
    }
  }
`;

const QUERY_CORE = `
  query BudgetSnapshot($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ${CORE_FIELDS}
    }
  }
`;

async function requestGraphQL(query, variables) {
  const endpoint = import.meta.env.WP_GRAPHQL_ENDPOINT || DEFAULT_ENDPOINT;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`WPGraphQL returned HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).join('; ');
    const graphQLError = new Error(message);
    graphQLError.graphQLErrors = payload.errors;
    throw graphQLError;
  }

  return payload.data;
}

function fallbackForSlug(slug) {
  const fallback = fallbackCityClerk?.data?.post;
  return fallback?.slug === slug ? fallback : null;
}

export async function getBudgetSnapshot(slug) {
  try {
    const data = await requestGraphQL(QUERY_WITH_SEO, { slug });
    if (!data?.post) throw new Error(`No WordPress post found for slug: ${slug}`);
    return { ...data.post, source: 'wordpress', seoAvailable: true };
  } catch (seoError) {
    // If the Yoast GraphQL extension is not installed, retry without `seo`.
    try {
      const data = await requestGraphQL(QUERY_CORE, { slug });
      if (!data?.post) throw new Error(`No WordPress post found for slug: ${slug}`);
      return { ...data.post, source: 'wordpress', seoAvailable: false };
    } catch (coreError) {
      const fallback = fallbackForSlug(slug);
      if (fallback) {
        console.warn(
          `[budget-snapshots] WPGraphQL unavailable for ${slug}; using bundled fallback data.`,
          coreError.message
        );
        return { ...fallback, source: 'fallback', seoAvailable: false };
      }

      throw coreError;
    }
  }
}
