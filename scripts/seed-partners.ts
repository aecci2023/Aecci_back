import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DUMMY_PARTNERS = [
  {
    email: 'amara.osei@aecci-partner.com',
    fullName: 'Amara Osei',
    country: 'Ghana',
    professionalTitle: 'Trade Facilitation Expert',
    yearsOfExperience: 9,
    languagesSpoken: ['English', 'French', 'Twi'],
    profile: {
      organization: 'West Africa Trade Hub',
      bio: 'Specialist in ECOWAS trade corridors, agricultural commodity exports, and customs compliance. Has facilitated over $40M in bilateral trade deals between West African nations and India.',
      expertiseCountries: ['Ghana', 'Nigeria', 'Ivory Coast', 'Senegal', 'India'],
      expertiseSectors: ['Agriculture', 'Commodities', 'Customs Compliance', 'ECOWAS Regulations', 'Textiles'],
      tier: 'Premium',
      status: 'active',
    },
  },
  {
    email: 'fatima.al-rashid@aecci-partner.com',
    fullName: 'Fatima Al-Rashid',
    country: 'UAE',
    professionalTitle: 'Gulf Market Entry Advisor',
    yearsOfExperience: 12,
    languagesSpoken: ['Arabic', 'English', 'Hindi'],
    profile: {
      organization: 'Dubai Trade Bridge Consultancy',
      bio: 'Expert in GCC regulatory frameworks, Halal certification pathways, and India-UAE CEPA implementation. Helps Indian SMEs penetrate UAE, Saudi, and Oman markets effectively.',
      expertiseCountries: ['UAE', 'Saudi Arabia', 'Oman', 'Qatar', 'Kuwait', 'India'],
      expertiseSectors: ['FMCG', 'Pharmaceuticals', 'Halal Products', 'Real Estate', 'Logistics'],
      tier: 'Specialist',
      status: 'active',
    },
  },
  {
    email: 'hans.mueller@aecci-partner.com',
    fullName: 'Hans Mueller',
    country: 'Germany',
    professionalTitle: 'European Market Specialist',
    yearsOfExperience: 15,
    languagesSpoken: ['German', 'English', 'French'],
    profile: {
      organization: 'Euro-Asia Trade Consulting GmbH',
      bio: 'Veteran trade consultant with deep expertise in EU compliance, GDPR for e-commerce, automotive supply chains, and India-EU FTA negotiations. Based in Frankfurt.',
      expertiseCountries: ['Germany', 'France', 'Netherlands', 'Austria', 'Switzerland', 'India'],
      expertiseSectors: ['Automotive', 'Engineering', 'Pharmaceuticals', 'EU Compliance', 'Machinery'],
      tier: 'Specialist',
      status: 'active',
    },
  },
  {
    email: 'priya.nair@aecci-partner.com',
    fullName: 'Priya Nair',
    country: 'United Kingdom',
    professionalTitle: 'UK-India Trade Corridor Advisor',
    yearsOfExperience: 10,
    languagesSpoken: ['English', 'Malayalam', 'Hindi'],
    profile: {
      organization: 'British-India Chamber Advisory',
      bio: 'Facilitates post-Brexit trade relationships between UK businesses and Indian manufacturers. Expertise in IP protection, services trade, and fintech cross-border regulations.',
      expertiseCountries: ['United Kingdom', 'Ireland', 'India', 'Singapore'],
      expertiseSectors: ['Fintech', 'IT Services', 'Pharmaceuticals', 'Education', 'Creative Industries'],
      tier: 'Premium',
      status: 'active',
    },
  },
  {
    email: 'chen.wei@aecci-partner.com',
    fullName: 'Chen Wei',
    country: 'Singapore',
    professionalTitle: 'ASEAN Trade & Investment Advisor',
    yearsOfExperience: 11,
    languagesSpoken: ['English', 'Mandarin', 'Malay'],
    profile: {
      organization: 'ASEAN Business Gateway Pte Ltd',
      bio: 'Connects Indian companies with Southeast Asian markets through Singapore as a hub. Specialises in RCEP utilisation, ASEAN supply chain optimisation, and cross-border digital trade.',
      expertiseCountries: ['Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'India'],
      expertiseSectors: ['Electronics', 'Digital Trade', 'Supply Chain', 'RCEP', 'Manufacturing'],
      tier: 'Specialist',
      status: 'active',
    },
  },
  {
    email: 'lucia.fernandez@aecci-partner.com',
    fullName: 'Lucia Fernandez',
    country: 'Brazil',
    professionalTitle: 'Latin America Trade Representative',
    yearsOfExperience: 8,
    languagesSpoken: ['Portuguese', 'Spanish', 'English'],
    profile: {
      organization: 'Mercosur Trade Partners',
      bio: 'Facilitates trade between India and Latin America, focusing on agri-business, mining, and pharmaceuticals. Expert in Mercosur trade regulations and Brazil customs procedures.',
      expertiseCountries: ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'India'],
      expertiseSectors: ['Agriculture', 'Mining', 'Pharmaceuticals', 'Chemicals', 'Textiles'],
      tier: 'Standard',
      status: 'active',
    },
  },
  {
    email: 'john.okafor@aecci-partner.com',
    fullName: 'John Okafor',
    country: 'Nigeria',
    professionalTitle: 'Nigeria-India Business Facilitator',
    yearsOfExperience: 7,
    languagesSpoken: ['English', 'Yoruba', 'Hausa'],
    profile: {
      organization: 'Lagos Trade Facilitation Bureau',
      bio: 'Bridges Indian businesses with Nigeria\'s growing consumer market. Expert in ECOWAS compliance, oil & gas ancillary services, and ICT sector development in West Africa.',
      expertiseCountries: ['Nigeria', 'Ghana', 'Cameroon', 'Kenya', 'India'],
      expertiseSectors: ['Oil & Gas', 'Telecoms', 'FMCG', 'Construction', 'Healthcare'],
      tier: 'Standard',
      status: 'active',
    },
  },
  {
    email: 'olga.petrov@aecci-partner.com',
    fullName: 'Olga Petrov',
    country: 'Kazakhstan',
    professionalTitle: 'Central Asia Trade Advisor',
    yearsOfExperience: 9,
    languagesSpoken: ['Russian', 'Kazakh', 'English'],
    profile: {
      organization: 'EurAsian Commerce Bridge',
      bio: 'Specialises in India-Central Asia trade routes through INSTC corridor. Expert in customs facilitation, pharmaceutical market access, and energy sector trade in Kazakhstan and CIS countries.',
      expertiseCountries: ['Kazakhstan', 'Uzbekistan', 'Russia', 'Azerbaijan', 'India'],
      expertiseSectors: ['Energy', 'Pharmaceuticals', 'Infrastructure', 'Agriculture', 'Mining'],
      tier: 'Premium',
      status: 'active',
    },
  },
  {
    email: 'amelia.van-der-berg@aecci-partner.com',
    fullName: 'Amelia van der Berg',
    country: 'South Africa',
    professionalTitle: 'Africa-India Trade Specialist',
    yearsOfExperience: 13,
    languagesSpoken: ['English', 'Afrikaans', 'Zulu'],
    profile: {
      organization: 'AfriTrade Advisory Services',
      bio: 'Deep expertise in SADC trade regulations, mining supply chains, and pharmaceutical exports from India to Southern Africa. Has led major trade missions between South Africa and Indian states.',
      expertiseCountries: ['South Africa', 'Zimbabwe', 'Mozambique', 'Zambia', 'Botswana', 'India'],
      expertiseSectors: ['Mining', 'Pharmaceuticals', 'Agriculture', 'Retail', 'Tourism'],
      tier: 'Premium',
      status: 'active',
    },
  },
  {
    email: 'takashi.yamamoto@aecci-partner.com',
    fullName: 'Takashi Yamamoto',
    country: 'Japan',
    professionalTitle: 'Japan-India Technology Trade Advisor',
    yearsOfExperience: 14,
    languagesSpoken: ['Japanese', 'English', 'Hindi'],
    profile: {
      organization: 'Indo-Japan Business Council',
      bio: 'Facilitates technology transfers, joint ventures, and FDI between Japan and India. Expert in DPIIT regulations, semiconductor supply chains, and Japanese corporate culture for India market entry.',
      expertiseCountries: ['Japan', 'South Korea', 'India', 'Australia'],
      expertiseSectors: ['Technology', 'Automotive', 'Electronics', 'Infrastructure', 'Pharmaceuticals'],
      tier: 'Specialist',
      status: 'active',
    },
  },
  {
    email: 'maria.kowalski@aecci-partner.com',
    fullName: 'Maria Kowalski',
    country: 'Poland',
    professionalTitle: 'Eastern Europe Trade Consultant',
    yearsOfExperience: 8,
    languagesSpoken: ['Polish', 'English', 'German', 'Russian'],
    profile: {
      organization: 'Visegrad Trade Partners',
      bio: 'Connects Indian exporters with Eastern European markets including Poland, Czech Republic, and Hungary. Expertise in EU single market compliance for India-origin goods and IT services offshoring.',
      expertiseCountries: ['Poland', 'Czech Republic', 'Hungary', 'Slovakia', 'Romania', 'India'],
      expertiseSectors: ['IT Services', 'Manufacturing', 'Food Processing', 'Pharmaceuticals', 'Auto Components'],
      tier: 'Standard',
      status: 'active',
    },
  },
  {
    email: 'ahmed.hassan@aecci-partner.com',
    fullName: 'Ahmed Hassan',
    country: 'Egypt',
    professionalTitle: 'MENA & North Africa Trade Expert',
    yearsOfExperience: 10,
    languagesSpoken: ['Arabic', 'English', 'French'],
    profile: {
      organization: 'Cairo Trade Facilitation Centre',
      bio: 'Expert in Egypt\'s Suez Canal free trade zones, COMESA regulations, and India-Africa corridor trade. Facilitates pharmaceutical, textile, and engineering goods trade across MENA region.',
      expertiseCountries: ['Egypt', 'Morocco', 'Tunisia', 'Libya', 'Sudan', 'India'],
      expertiseSectors: ['Pharmaceuticals', 'Textiles', 'Engineering Goods', 'Food Processing', 'Tourism'],
      tier: 'Premium',
      status: 'active',
    },
  },
];

async function seedPartners() {
  console.log('🌱 Seeding dummy partners...');

  let created = 0;
  let skipped = 0;

  for (const partner of DUMMY_PARTNERS) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: partner.email } });
      if (existing) {
        console.log(`  ⏭  Skipping ${partner.fullName} (already exists)`);
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash('Partner@2024#', 10);

      const user = await prisma.user.create({
        data: {
          email: partner.email,
          password: hashedPassword,
          fullName: partner.fullName,
          role: 'partner',
          country: partner.country,
          professionalTitle: partner.professionalTitle,
          yearsOfExperience: String(partner.yearsOfExperience),
          languagesSpoken: partner.languagesSpoken,
          isEmailVerified: true,
          kycStatus: 'active',
          applicationNumber: `AECCI-PARTNER-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        },
      });

      await prisma.partnerProfile.create({
        data: {
          userId: user.id,
          organization: partner.profile.organization,
          bio: partner.profile.bio,
          expertiseCountries: partner.profile.expertiseCountries,
          expertiseSectors: partner.profile.expertiseSectors,
          tier: partner.profile.tier,
          status: partner.profile.status,
        },
      });

      console.log(`  ✅ Created partner: ${partner.fullName} (${partner.country})`);
      created++;
    } catch (err: any) {
      console.error(`  ❌ Error creating ${partner.fullName}:`, err.message);
    }
  }

  console.log(`\n📊 Done — ${created} created, ${skipped} skipped`);
}

seedPartners()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
