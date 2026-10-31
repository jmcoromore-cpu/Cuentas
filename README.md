# Cuentas

App personal para controlar gastos, ingresos, inversiones y traspasos en **efectivo** y en **cuenta**.

- **Inicio:** saldo disponible (cuenta + efectivo), resumen del mes y lista de movimientos. Toca un movimiento para editarlo o borrarlo.
- **+ Nuevo movimiento:** Gasto, Ingreso, Inversión o Traspaso. La fecha es hoy por defecto y se puede cambiar.
- **Resumen:** vista por **Mes** y por **Año**, con total, efectivo y cuenta por separado.
- **Ajustes:** saldo inicial, copia de seguridad (.json), restaurar copia y exportar a Excel (.csv).

Los datos se guardan solo en el dispositivo y navegador donde uses la app (no hay servidor). Haz copias de seguridad de vez en cuando desde Ajustes.

## Publicarla en GitHub Pages

1. Crea una cuenta en https://github.com (si no la tienes).
2. Pulsa **New repository**, llámalo `cuentas`, déjalo **Public** y pulsa **Create repository**.
3. En el repositorio vacío pulsa **uploading an existing file**, arrastra todos los archivos de esta carpeta (no la carpeta, su contenido) y pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y pulsa **Save**.
5. Espera 1–2 minutos. Tu app estará en `https://TU-USUARIO.github.io/cuentas/`.

## Instalarla en el móvil

- **iPhone (Safari):** abre la dirección → botón Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome):** abre la dirección → menú ⋮ → **Instalar app** o **Añadir a pantalla de inicio**.

Úsala siempre desde el icono instalado: así los datos se quedan en el mismo sitio.

## Actualizar la app

Sube los archivos modificados al repositorio y cambia en `sw.js` la línea `const CACHE = 'cuentas-v1';` a `cuentas-v2` (v3, v4…) para que el móvil descargue la versión nueva. Tus datos no se borran al actualizar.
