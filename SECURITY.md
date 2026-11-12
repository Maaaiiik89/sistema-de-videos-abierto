# Reportar un problema de seguridad

Si encuentras una falla de seguridad (por ejemplo, algo que deje que otra página use el panel, que el instalador o `Actualizar.bat` acepten un archivo que no es el publicado, o que el sistema escriba fuera de su carpeta), **no la publiques como issue**.

Repórtala en privado desde la pestaña **Security** de este repositorio → **Report a vulnerability**. Si esa opción no aparece, usa el formulario de contacto de [miguelurra.lat](https://miguelurra.lat).

Cuenta qué pasa, cómo repetirlo y la versión (está en `sistema.json`). Es un proyecto pequeño mantenido por una persona: la respuesta puede tardar unos días, y se corrige en la siguiente versión.

## Versiones con correcciones

Solo la última versión publicada recibe correcciones. `Actualizar.bat` (o el botón del panel) la instala sin tocar tus datos.

## Qué cubre

Lo que hace el sistema con tus datos, qué instala, el diseño de seguridad del panel y cómo verificar una descarga están explicados en [SEGURIDAD.md](SEGURIDAD.md). Las fallas de las apps de IA, de HyperFrames u otros programas que instala el sistema se reportan a quienes los hacen.
