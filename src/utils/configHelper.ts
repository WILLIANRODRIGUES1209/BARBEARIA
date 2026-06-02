import { supabase } from '../supabase';

export interface ConfigType {
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  logoUrl: string;
}

export async function loadConfig(barbeariaId: string): Promise<ConfigType> {
  const defaultMin: ConfigType = {
    workStart: "08:00",
    workEnd: "19:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    logoUrl: ""
  };

  // 1. Check local cache
  let localCache: Partial<ConfigType> = {};
  try {
    const cached = localStorage.getItem(`config_${barbeariaId}`);
    if (cached) {
      localCache = JSON.parse(cached);
    }
  } catch (e) {
    console.error("Local config read error", e);
  }

  // 2. Try to fetch from server API
  try {
    const res = await fetch(`/api/config?barbeariaId=${barbeariaId}`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        const loaded: ConfigType = {
          workStart: data.workStart || defaultMin.workStart,
          workEnd: data.workEnd || defaultMin.workEnd,
          lunchStart: data.lunchStart || defaultMin.lunchStart,
          lunchEnd: data.lunchEnd || defaultMin.lunchEnd,
          logoUrl: data.logoUrl || defaultMin.logoUrl
        };
        try {
          localStorage.setItem(`config_${barbeariaId}`, JSON.stringify(loaded));
        } catch (e) {}
        return loaded;
      }
    }
  } catch (err) {
    console.warn("API config load failed, using fallbacks", err);
  }

  // 3. Try to load config from special row in barbeiros table (accessible publicly)
  try {
    const { data: bData, error: bError } = await supabase
      .from('barbeiros')
      .select('telefone')
      .eq('nome', '__SYSTEM_CONFIG__')
      .eq('barbearia_id', barbeariaId)
      .maybeSingle();

    if (bData && !bError && bData.telefone) {
      try {
        const parsed = JSON.parse(bData.telefone);
        const loaded: ConfigType = {
          workStart: parsed.workStart || defaultMin.workStart,
          workEnd: parsed.workEnd || defaultMin.workEnd,
          lunchStart: parsed.lunchStart || defaultMin.lunchStart,
          lunchEnd: parsed.lunchEnd || defaultMin.lunchEnd,
          logoUrl: parsed.logoUrl || defaultMin.logoUrl
        };
        try {
          localStorage.setItem(`config_${barbeariaId}`, JSON.stringify(loaded));
        } catch (e) {}
        return loaded;
      } catch (parseError) {
        console.error("Failed to parse config from barbeiro row JSON:", parseError);
      }
    }
  } catch (supabaseErr) {
    console.warn("Supabase configuration from barbeiros row load skipped/failed:", supabaseErr);
  }

  // 4. Dynamic Supabase schema probe as a final legacy fallback
  try {
    const { data, error } = await supabase
      .from('barbearias')
      .select('*')
      .eq('id', barbeariaId)
      .maybeSingle();

    if (data && !error) {
      const dbLogoUrl = data.logo_url || data.logoUrl;
      const dbWorkStart = data.work_start || data.workStart;
      const dbWorkEnd = data.work_end || data.workEnd;
      const dbLunchStart = data.lunch_start || data.lunchStart;
      const dbLunchEnd = data.lunch_end || data.lunchEnd;

      if (dbLogoUrl !== undefined || dbWorkStart !== undefined) {
        const loaded: ConfigType = {
          workStart: dbWorkStart || localCache.workStart || defaultMin.workStart,
          workEnd: dbWorkEnd || localCache.workEnd || defaultMin.workEnd,
          lunchStart: dbLunchStart || localCache.lunchStart || defaultMin.lunchStart,
          lunchEnd: dbLunchEnd || localCache.lunchEnd || defaultMin.lunchEnd,
          logoUrl: dbLogoUrl || localCache.logoUrl || defaultMin.logoUrl
        };
        try {
          localStorage.setItem(`config_${barbeariaId}`, JSON.stringify(loaded));
        } catch (e) {}
        return loaded;
      }
    }
  } catch (supabaseErr) {
    console.warn("Supabase dynamic schema read bypassed:", supabaseErr);
  }

  // Merge any available cache values with standard defaults
  return {
    workStart: localCache.workStart || defaultMin.workStart,
    workEnd: localCache.workEnd || defaultMin.workEnd,
    lunchStart: localCache.lunchStart || defaultMin.lunchStart,
    lunchEnd: localCache.lunchEnd || defaultMin.lunchEnd,
    logoUrl: localCache.logoUrl || defaultMin.logoUrl
  };
}

export async function saveConfig(barbeariaId: string, config: ConfigType): Promise<{ success: boolean; isLocal: boolean; error?: string }> {
  // Always update local cache first
  try {
    localStorage.setItem(`config_${barbeariaId}`, JSON.stringify(config));
  } catch (e) {
    console.error("Local storage save failed", e);
  }

  let apiSuccess = false;
  let supabaseSuccess = false;
  let errorMsg = "";

  // 1. Try sending to local server Express API
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barbeariaId,
        ...config
      })
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        apiSuccess = true;
      }
    } else {
      errorMsg = `Status ${res.status}`;
    }
  } catch (err: any) {
    console.warn("API config save failed (Expected on static Vercel)", err);
    errorMsg = err.message || "Network Error";
  }

  // 2. Try saving inside barbeiros table under '__SYSTEM_CONFIG__' (Accessible via Row Level Security & writable by admin)
  try {
    const configString = JSON.stringify(config);
    const { data: existing, error: findError } = await supabase
      .from('barbeiros')
      .select('id')
      .eq('nome', '__SYSTEM_CONFIG__')
      .eq('barbearia_id', barbeariaId)
      .maybeSingle();

    if (!findError) {
      if (existing) {
        const { error: updateError } = await supabase
          .from('barbeiros')
          .update({
            telefone: configString,
            ativo: true
          })
          .eq('id', existing.id);

        if (!updateError) {
          supabaseSuccess = true;
        } else {
          console.error("Error updating config in barbeiros table:", updateError);
          errorMsg = updateError.message;
        }
      } else {
        const { error: insertError } = await supabase
          .from('barbeiros')
          .insert({
            barbearia_id: barbeariaId,
            nome: '__SYSTEM_CONFIG__',
            telefone: configString,
            ativo: true
          });

        if (!insertError) {
          supabaseSuccess = true;
        } else {
          console.error("Error inserting config in barbeiros table:", insertError);
          errorMsg = insertError.message;
        }
      }
    } else {
      console.error("Error finding existing config in barbeiros:", findError);
      errorMsg = findError.message;
    }
  } catch (supabaseErr: any) {
    console.warn("Supabase barbeiros fallback save bypassed/failed:", supabaseErr);
    errorMsg = supabaseErr.message || String(supabaseErr);
  }

  // 3. Standby try updating columns on barbearias in Supabase dynamically (legacy fallback)
  if (!supabaseSuccess) {
    try {
      const { error: error1 } = await supabase
        .from('barbearias')
        .update({
          logo_url: config.logoUrl,
          work_start: config.workStart,
          lunch_start: config.lunchStart,
          lunch_end: config.lunchEnd,
          work_end: config.workEnd
        } as any)
        .eq('id', barbeariaId);

      if (!error1) {
        supabaseSuccess = true;
      }
    } catch (supabaseErr) {}
  }

  // We return success: true as long as we succeeded either in API, Supabase, or at least in local device memory cache
  if (apiSuccess || supabaseSuccess) {
    return { success: true, isLocal: false };
  } else {
    // If it is stored locally in client's localstorage we still report success so UI stays robust,
    // but tell them isLocal so they understand it fallback-saved.
    return { success: true, isLocal: true, error: errorMsg };
  }
}

