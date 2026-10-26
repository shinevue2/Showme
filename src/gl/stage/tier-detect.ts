/**
 * WebGL2 capability probe (DESIGN §8.6 tier detection, threejs §i `detectTier`). Owner: WP-00.
 * Pure DOM — no three import — so it runs before the `three` chunk is fetched.
 */

export interface GLProbe {
  ok: boolean;               // a WebGL2 context could be created at all
  caveat: boolean;           // only with failIfMajorPerformanceCaveat=false (software)
  renderer: string;          // unmasked renderer string (lower-case)
  caps: { floatRT: boolean; floatLinear: boolean; parallelCompile: boolean; maxTexture: number };
}

export const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/;

export function probeGL(): GLProbe {
  const none: GLProbe = { ok: false, caveat: false, renderer: '', caps: { floatRT: false, floatLinear: false, parallelCompile: false, maxTexture: 0 } };
  try {
    const c = document.createElement('canvas');
    let gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) as WebGL2RenderingContext | null;
    let caveat = false;
    if (!gl) {
      gl = c.getContext('webgl2') as WebGL2RenderingContext | null;
      caveat = !!gl;
    }
    if (!gl) return none;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '').toLowerCase();
    const caps = {
      floatRT: !!gl.getExtension('EXT_color_buffer_float'),
      floatLinear: !!gl.getExtension('OES_texture_float_linear'),
      parallelCompile: !!gl.getExtension('KHR_parallel_shader_compile'),
      maxTexture: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();   // free the probe context now
    return { ok: true, caveat, renderer, caps };
  } catch {
    return none;
  }
}
