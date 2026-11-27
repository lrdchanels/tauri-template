// Spanish UI copy: the source of truth for message keys. Every other locale must have exactly the
// same keys (enforced by the type checker in en.ts). Plain sentences, sentence case, no all-caps.
// `{name}` placeholders are filled by t(); `{ one, other }` entries are chosen with `count`.

export type Message = string | { one: string; other: string };

export const es = {
  'nav.sections': 'Secciones',
  'nav.settings': 'Ajustes',

  'sidebar.private.hide': 'Ocultar importes',
  'sidebar.private.show': 'Mostrar importes',
  'sidebar.private.title': 'Ocultar importes ({shortcut})',
  'sidebar.theme.title': 'Cambiar el tema',

  'theme.system': 'Tema del sistema',
  'theme.light': 'Tema claro',
  'theme.dark': 'Tema oscuro',

  'locale.system': 'El del sistema',
  'keys.shift': 'Mayús',

  'dialog.cancel': 'Cancelar',

  'update.available': 'Hay una versión nueva de {app} ({version}).',
  'update.install': 'Instalar y reiniciar',
  'update.downloading': 'Descargando la versión nueva…',
  'update.progress': 'Descargando la versión nueva… {percent} %',
  'update.failed': 'No se ha podido actualizar: {error}',
  'update.found': 'Hay una versión nueva: {version}.',
  'update.none': 'Tienes la última versión.',

  'backup.fileDescription': 'Copia de seguridad de {app}',
  'backup.saved': 'Copia guardada.',
  'backup.restoreTitle': 'Restaurar copia',
  'backup.restoreConfirm': 'Se sustituyen tus datos y ajustes por los de la copia.',
  'backup.restoreAction': 'Restaurar',
  'backup.restored': 'Copia restaurada.',
  'backup.invalid': 'El fichero no es una copia de seguridad de {app}.',
  'backup.newer': 'La copia es de una versión más nueva de {app}: actualiza la app antes de restaurarla.',

  'reset.title': 'Borrar todos los datos',
  'reset.confirm':
    'Se borran todos tus datos y ajustes. No se puede deshacer: si quieres, guarda antes una copia.',
  'reset.action': 'Borrar todo',
  'reset.done': 'Datos borrados.',

  'error.loadData': 'No se han podido leer tus datos: {error}',
  'error.title': 'Algo ha fallado',
  'error.body':
    'La app ha encontrado un error inesperado. Puedes seguir usándola; si se repite, copia el detalle y avísanos.',
  'error.copy': 'Copiar detalle',
  'error.copied': 'Detalle copiado.',
  'error.copyFailed': 'No se ha podido copiar el detalle.',
  'error.report': 'Informar del problema',
  'error.dismiss': 'Cerrar',

  'menu.file': 'Archivo',
  'menu.edit': 'Edición',
  'menu.view': 'Ver',
  'menu.help': 'Ayuda',
  'menu.about': 'Acerca de {app}',
  'menu.backupExport': 'Guardar copia de seguridad…',
  'menu.backupRestore': 'Restaurar copia…',
  'menu.settings': 'Ajustes…',
  'menu.togglePrivate': 'Ocultar o mostrar importes',
  'menu.toggleTheme': 'Cambiar el tema',
  'menu.reload': 'Recargar',
  'menu.dataFolder': 'Abrir carpeta de datos',
  'menu.logFolder': 'Abrir carpeta de registros',
  'menu.checkUpdates': 'Buscar actualizaciones…',

  'table.export': 'Exportar a CSV',
  'table.empty': 'Nada que enseñar.',
  'table.csvDescription': 'CSV para Excel',

  'settings.general': 'General',
  'settings.data': 'Datos',
  'settings.about': 'Acerca de',
  'settings.sections': 'Secciones de ajustes',
  'settings.general.sub': 'Cómo se ve y se comporta la app.',
  'settings.theme': 'Tema',
  'settings.language': 'Idioma',
  'settings.updates': 'Buscar actualizaciones al abrir la app',
  'settings.shortcut': 'Atajo global {shortcut} para mostrar la ventana',
  'settings.shortcut.hint': 'Funciona aunque la app esté en segundo plano.',
  'settings.notify.title': 'Notificaciones',
  'settings.notify.text': 'Comprueba que el sistema deja a la app enseñar avisos.',
  'settings.notify.test': 'Probar notificación',
  'settings.notify.body': 'Las notificaciones funcionan.',
  'settings.data.sub': 'Tus datos se guardan solo en este ordenador.',
  'settings.data.backup.title': 'Copia de seguridad',
  'settings.data.backup.text': 'Guarda en un fichero todos tus datos y ajustes, o recupéralos de una copia.',
  'settings.data.backup.export': 'Guardar copia',
  'settings.data.backup.restore': 'Restaurar copia',
  'settings.data.folder.title': 'Carpeta de datos',
  'settings.data.folder.text': 'Los ficheros JSON de la app y sus registros, por si los necesitas.',
  'settings.data.folder.open': 'Abrir carpeta de datos',
  'settings.data.logs.open': 'Abrir registros',
  'settings.data.reset.title': 'Borrar todo',
  'settings.data.reset.text': 'Deja la app como recién instalada.',
  'settings.about.version': 'Versión {version}',
  'settings.about.browser': 'Modo navegador (desarrollo): los datos se guardan en localStorage.',
  'settings.about.check': 'Buscar actualizaciones',

  'browser.dataFolder': 'En el navegador los datos están en localStorage.',

  'home.title': 'Inicio',
  'home.lead':
    'La vista de ejemplo de la plantilla: guarda datos y los enseña en una tabla y en una gráfica. Cópiala para empezar la tuya o bórrala.',
  'home.form.name': 'Nombre',
  'home.form.amount': 'Importe',
  'home.form.add': 'Añadir',
  'home.form.invalid': 'Escribe un nombre y un importe.',
  'home.added': 'Elemento añadido.',
  'home.items.title': 'Elementos',
  'home.items.count': {
    one: '{count} elemento, {total} en total',
    other: '{count} elementos, {total} en total',
  },
  'home.items.empty': 'Aún no hay elementos: añade el primero arriba.',
  'home.col.name': 'Nombre',
  'home.col.created': 'Creado',
  'home.col.amount': 'Importe',
  'home.remove': 'Quitar {name}',
  'home.chart.title': 'Importe por mes',
  'home.chart.series': 'Importe',
} as const satisfies Record<string, Message>;
