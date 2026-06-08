# Mejora del login: forzar selector de cuenta + mensaje de error

**Fecha:** 2026-06-07
**Estado:** Aprobado

## Problema

Cuando un usuario intenta entrar con una cuenta que no es `@arzion` (o con email
no verificado), el `signIn` callback devuelve `false` y Auth.js redirige a
`/?error=AccessDenied`. Hoy pasan dos cosas malas:

1. **No se ofrece "Usar otra cuenta".** El provider de Google no manda
   `prompt=select_account`. Si el browser ya tiene una sesión de Google abierta,
   Google la reusa en silencio. El usuario rechazado vuelve a tocar "Ingresar con
   Google", Google le re-inyecta la misma cuenta ya rechazada → loop sin salida.
2. **El rechazo es invisible.** `src/app/page.tsx` ignora el query param `error`.
   El usuario ve la misma pantalla sin ninguna explicación de qué pasó.

## Objetivo

- Forzar que Google siempre ofrezca elegir/cambiar de cuenta.
- Mostrar en la home un mensaje claro cuando el acceso fue denegado, usando el
  botón existente como reintento.

## Cambios

### 1. Forzar el selector de cuenta — `src/auth.config.ts`

Agregar `authorization.params.prompt` al provider de Google:

```ts
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: { params: { prompt: "select_account" } },
}),
```

Efecto: Google siempre muestra "Elegir una cuenta / Usar otra cuenta", aun con
sesión activa. Rompe el loop de rechazo.

### 2. Mapeo de error → mensaje — `src/lib/access.ts` (o módulo nuevo)

Función pura, testeable:

```ts
loginErrorMessage(code: string | undefined): string | null
```

- `undefined` / vacío → `null` (no mostrar nada).
- `"AccessDenied"` → mensaje de dominio: la cuenta no tiene acceso, exclusivo
  `@arzion`, probá de nuevo y elegí tu cuenta de trabajo.
- cualquier otro código → mensaje genérico: hubo un problema al iniciar sesión,
  intentá de nuevo.

### 3. Banner de error — `src/components/LoginError.tsx` (nuevo)

Componente presentacional puro. Recibe `message: string` y renderiza un aviso
tipo alerta acorde al diseño existente (`rounded`, `border`, tono de error suave
sobre `bg-card`). Sin lógica de negocio.

### 4. Lectura del error — `src/app/page.tsx` (mod)

- Recibir `searchParams` (Next 16: es un `Promise`, hay que `await`). Usar el
  helper `PageProps<'/'>`.
- `const { error } = await searchParams`.
- `const msg = loginErrorMessage(typeof error === "string" ? error : undefined)`.
- Si `msg`, renderizar `<LoginError message={msg} />` arriba del `SignInButton`.

## Unidades y responsabilidades

| Unidad | Qué hace | Depende de |
|---|---|---|
| `auth.config.ts` (mod) | Fuerza el account chooser | provider Google |
| `loginErrorMessage` (nuevo, en `access.ts`) | code → texto | nada (pura) |
| `LoginError.tsx` (nuevo) | render del aviso | nada (presentacional) |
| `page.tsx` (mod) | lee `?error`, decide mostrar banner | `searchParams`, los dos de arriba |

## Testing

- Unit (vitest, colocado en `src/lib/access.test.ts`): `loginErrorMessage` con
  `undefined`, `"AccessDenied"`, y un código desconocido.
- Visual: banner visible al entrar a `/?error=AccessDenied`.

## Fuera de alcance

- Distinguir "no @arzion" de "email no verificado" (ambos colapsan en
  `AccessDenied`; no hay señal para separarlos).
- Cambios en el copy de la home fuera del banner.
