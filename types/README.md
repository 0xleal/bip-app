# Database Types

This directory contains TypeScript type definitions for the application.

## Supabase Types

The `supabase.ts` file contains auto-generated types from the Supabase database schema.

### Regenerating Types

Whenever you make changes to the database schema in Supabase, regenerate the types by running:

```bash
supabase gen types typescript --project-id gtmmkucjvvheodkhutta > types/supabase.ts
```

This ensures your TypeScript code stays in sync with the actual database schema.

### Usage

Import types from `@/types/supabase`:

```typescript
import type { Database } from '@/types/supabase';

// Access table types
type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
```
