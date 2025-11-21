# SavingsAgent

> **Promotional Offer Aggregator & Analyzer**

SavingsAgent is a web application designed to structure and aggregate promotional offers from popular discount store flyers (starting with Lidl and Biedronka). It solves the problem of fragmented, image-based promotional data by transforming flyer images into a searchable, structured database using OCR and LLM technologies.

The system consists of two main interfaces:
1.  **Admin Panel:** For uploading flyers, triggering AI processing pipelines, and manually verifying/correcting data.
2.  **Client Application:** For users to browse, filter, and search through aggregated offers.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

Currently, consumers have to browse multiple websites or scroll through digital images of paper flyers to find deals. SavingsAgent automates the extraction of product data (Name, Price, Description) from these images.

**Key Features:**
*   **Image-to-Data Pipeline:** Converts JPG/PNG flyers into JSON using OCR and LLM (via OpenRouter).
*   **Split-Screen Verification:** Admin interface for efficient side-by-side comparison of original images and extracted data.
*   **Search Engine:** Full Text Search (FTS) for products across different stores.
*   **Structured Filtering:** Filter by store (Lidl, Biedronka) and standardized categories.

## Tech Stack

This project uses a modern, performance-oriented stack centered around Astro and React.

### Frontend
*   **Framework:** [Astro 5](https://astro.build/) (Server-side rendering & static generation)
*   **UI Library:** [React 19](https://react.dev/) (For interactive components)
*   **Language:** [TypeScript 5](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **Components:** [Shadcn/ui](https://ui.shadcn.com/) & [Lucide React](https://lucide.dev/) (Icons)

### Backend & Data
*   **BaaS:** [Supabase](https://supabase.com/)
    *   **Database:** PostgreSQL
    *   **Auth:** Supabase Auth
    *   **Storage:** Supabase Storage (for flyer images)

### AI & Processing
*   **Model Gateway:** OpenRouter.ai
*   **OCR/Processing:** Tesseract.js, Custom LLM Pipelines

## Getting Started Locally

Follow these steps to get the project running on your local machine.

### Prerequisites

*   **Node.js:** Version `22.14.0` (Strictly required).
    *   *Tip: Use `nvm` to switch versions automatically via the included `.nvmrc` file.*
*   **Package Manager:** `npm` (or pnpm/yarn).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/savings-agent.git
    cd savings-agent
    ```

2.  **Set up Node version:**
    ```bash
    nvm use
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Environment Configuration:**
    Create a `.env` file in the root directory. You will need credentials for Supabase and OpenRouter.
    ```bash
    # Example .env structure
    PUBLIC_SUPABASE_URL=your_supabase_url
    PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    OPENROUTER_API_KEY=your_openrouter_key
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should be available at `http://localhost:4321`.

## Available Scripts

In the project directory, you can run:

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server. |
| `npm run build` | Builds the production-ready site to `./dist`. |
| `npm run preview` | Previews the built project locally. |
| `npm run lint` | Runs ESLint to check for code quality issues. |
| `npm run lint:fix` | Runs ESLint and automatically fixes fixable issues. |
| `npm run format` | Formats code using Prettier. |

## Project Scope

The current version (MVP) focuses on specific boundaries:

*   **Supported Stores:** Lidl and Biedronka only.
*   **Input Formats:** JPG/PNG images (PDFs must be converted externally).
*   **Language:** Polish interface and data only.
*   **User Features:** Browsing and searching only (No shopping cart, favorites, or price history in MVP).
*   **Data Acquisition:** Manual upload of flyer pages (No automated crawling).

## Project Status

🚧 **Status: In Active Development (MVP Phase)**

The project is currently in the MVP stage, focusing on establishing the "Image -> Database" pipeline and the Admin verification interface.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
