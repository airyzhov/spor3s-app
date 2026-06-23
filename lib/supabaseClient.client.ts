   import { createClient } from "@supabase/supabase-js";


   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

   if (!supabaseUrl || !supabaseAnonKey) {
     if (typeof window !== 'undefined') {
       // Только на клиенте выводим ошибку
       console.error("[spor3s-app] Ошибка: NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY не определены!");
     }
   }

   export const supabase =
     supabaseUrl && supabaseAnonKey
       ? createClient(supabaseUrl, supabaseAnonKey)
       : null;