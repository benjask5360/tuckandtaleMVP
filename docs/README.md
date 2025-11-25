# Tuck and Tale MVP

AI-Powered Personalized Bedtime Story Platform

## 🎯 Mission

Tuck and Tale is an AI-powered personalized bedtime story platform where parents create character profiles and the app instantly generates personalized illustrated stories featuring their child as the hero.

## 🚀 Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL + Auth)
- **AI Services:**
  - OpenAI GPT-4 Turbo (story generation)
  - Leonardo.ai (image generation)
- **Deployment:** Vercel + Supabase Cloud

## 📋 Features

### MVP Features
- User authentication (email/password)
- Character profile creation (4 types: Child, Pet, Friend, Magical Creature)
- AI-powered story generation (3 lengths)
- AI illustration generation with character consistency
- Story library with persistence
- Responsive design for all devices

### Character Types
- **Child:** Main hero with full customization
- **Pet:** Animal companions
- **Supporting Characters:** Other human characters, e.g. friends and family
- **Magical Creature:** Fantasy companions

### Story Options
- **Length:** Short (5 min), Medium (10 min), Long (15 min)
- **Themes:** Adventure, Fantasy, Bedtime, Educational, Birthday Special
- **Lessons:** Moral values like sharing, bravery, kindness

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account
- OpenAI API key
- Leonardo.ai API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tuckandtaleMVP.git
cd tuckandtaleMVP
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your API keys in `.env.local`:
   - Supabase URL and keys
   - OpenAI API key
   - Leonardo.ai API key

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
tuckandtaleMVP/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client & helpers
│   ├── openai/           # OpenAI integration
│   └── leonardo/         # Leonardo.ai integration
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── utils/                 # Helper functions
└── public/               # Static assets
```

## 🗄️ Database Schema

### Main Tables
- `users` - User accounts (via Supabase Auth)
- `characters` - Character profiles with flexible JSONB attributes
- `stories` - Generated stories with metadata
- `media` - Avatar and illustration storage

## 🔐 Environment Variables

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo-preview

# Leonardo.ai
LEONARDO_API_KEY=
LEONARDO_MODEL_ID=lucid_realism_512

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📝 Development Workflow

1. **Feature Development:** Create feature branches from `main`
2. **Testing:** Test locally before pushing
3. **Deployment:** Push to `main` for automatic Vercel deployment

## 🚧 Roadmap

### Phase 1 (Current)
- ✅ Project setup
- ⏳ Database schema
- ⏳ Authentication
- ⏳ Character profiles
- ⏳ Story generation
- ⏳ Image generation
- ⏳ PDF export
- ⏳ Payment processing (Stripe)

### Phase 2 (Next)
- [ ] Email notifications
- [ ] Social sharing
- [ ] Analytics dashboard

### Phase 3 (Future)
- [ ] Subscription plans
- [ ] Multi-language support
- [ ] Mobile app

## 📞 Support

For issues or questions, please create an issue in the GitHub repository.

## 📄 License

Private project - All rights reserved