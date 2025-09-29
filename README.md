# Tingle – Dating and Creator Subscription Platform

Tingle is a hybrid social platform that combines dating interactions with creator-based subscriptions. Users can discover profiles, chat, and unlock premium content directly from creators. The experience is designed to merge the familiar flow of dating apps with the monetization features found in creator platforms.

---

## Key Features

- Dark-mode interface with neon highlights  
- Login and signup flow (front-end simulation)  
- Explore page with creator profile cards  
- Individual profile pages with bio, preview content, and action buttons (Subscribe, Message, Tip)  
- Simulated chat interface to demonstrate conversation flow  
- Creator application form with age and identity validation

---

## Creator Application Requirements

To discourage minors and ensure responsible onboarding, the application form includes:

- Full Legal Name  
- Display Name / Stage Name  
- Date of Birth (18+ validation)  
- Email Address  
- Gender  
- City / Country  
- Profile Photo Upload  
- Government ID Upload (placeholder for review)  
- Short Bio / Introduction  
- Content Category or Niche (e.g. Flirty Chat, Fitness, Adult Content)  
- Subscription Pricing

A mandatory confirmation statement must be displayed:

> “By submitting this application, I confirm that I am 18 or older and legally permitted to share suggestive or adult content. I understand that all applications are subject to review before approval.”

---

## Legal Disclaimer

Tingle is strictly intended for users aged 18 and over. Any content involving minors is prohibited. All creator applications must undergo verification before approval. This version of the platform is provided for demonstration and development purposes only and is not operating as a live commercial service.

---

## Technology Stack

| Layer        | Technology                     |
|--------------|---------------------------------|
| Framework    | React (with TypeScript)         |
| Build Tool   | Vite                            |
| Styling      | TailwindCSS or custom styling   |
| Routing      | Client-side navigation          |
| Assets       | Local or placeholder images     |

---

## Installation & Setup

```sh
# Clone the repository
git clone <your-repo-url>
cd tingle

# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
