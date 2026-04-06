## Getting Started

Run the development server from the `frontend` directory:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Create a local environment file before starting the app:

```bash
cp .env.example .env
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deploying Frontend Only To Vercel

This repository contains both `backend` and `frontend`, but Vercel should deploy only the Next.js app in `frontend`.

Use these project settings in Vercel:

- Framework Preset: `Next.js`
- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave empty

Add these environment variables in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If you import the whole Git repository into Vercel, make sure the project's Root Directory is set to `frontend`. That is the key step that keeps Vercel from trying to build the backend.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Vercel CLI

You can also deploy from the `frontend` directory with the Vercel CLI:

```bash
vercel
```

For production:

```bash
vercel --prod
```
