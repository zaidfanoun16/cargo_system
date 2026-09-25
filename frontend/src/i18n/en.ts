import type ar from './ar'

// Must have the same keys as the Arabic translations
const en: typeof ar = {
  app: {
    tagline: 'Car rental made easy',
  },
  nav: {
    home: 'Home',
    cars: 'Cars',
    login: 'Log in',
    menu: 'Menu',
    close: 'Close',
  },
  settings: {
    language: 'عربي',
    languageLabel: 'Switch language to Arabic',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
  },
  home: {
    eyebrow: 'Premium car rental',
    title: 'Drive the car of your dreams',
    subtitle:
      'Pick the right car for you, by the day or by the hour, and book it in minutes.',
    scroll: 'Discover more',
    highlights: {
      discount: 'Discount of up to',
      minimum: 'hours minimum booking',
      online: 'Book online any time',
    },
    categoriesTitle: 'Choose your style',
    categoriesSubtitle: 'From sports cars to SUVs, there is a car for every trip.',
    categories: {
      sports: 'Sports',
      super: 'Supercar',
      suv: 'SUV',
      luxury: 'Luxury',
    },
    explore: 'Explore',
    stepsTitle: 'Book in three steps',
    steps: {
      search: {
        title: 'Pick your dates',
        text: 'Choose when you pick the car up and when you return it.',
      },
      choose: {
        title: 'Choose your car',
        text: 'We only show the cars that are free for that period.',
      },
      drive: {
        title: 'Book and drive',
        text: 'Confirm the booking, and get an email as soon as it is approved.',
      },
    },
    ctaTitle: 'Ready for your next trip?',
    ctaText: 'Premium cars with clear prices, and automatic discounts on long rentals.',
    ctaButton: 'Browse cars',
    searchTitle: 'Find an available car',
    from: 'From',
    to: 'To',
    search: 'Search',
    featuresTitle: 'Why CarGo?',
    features: {
      availability: {
        title: 'Really available cars',
        text: 'We only show cars that are free on the days you choose.',
      },
      hourly: {
        title: 'By the day or the hour',
        text: 'Book for two hours or a month, and we pick the cheaper price for you.',
      },
      discounts: {
        title: 'Automatic discounts',
        text: '10% off for 7 days or more, and 20% off for 30 days or more.',
      },
      reviews: {
        title: 'Real reviews',
        text: 'Reviews from people who actually rented the car.',
      },
    },
  },
  footer: {
    rights: 'All rights reserved',
  },
  notFound: {
    title: 'Page not found',
    text: 'The page you are looking for does not exist or was moved.',
    back: 'Back to home',
  },
  comingSoon: 'This page is under construction',
  currency: {
    perDay: 'per day',
    perHour: 'per hour',
  },
}

export default en
