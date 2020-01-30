/* cargo los modulos necesarios para las ventanas y menu de navegacion */
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
/* modulo carga de archivos/url */
const url = require('url');
const path = require('path');
/* modulo para leer/escribir archivos */
const fs = require('fs');

/* icono de la app */
const nativeImage = require('electron').nativeImage;
var image = nativeImage.createFromPath(__dirname + './img/icono.png'); 

/* variable global */
let mainWindow;
let newNoteWindow;
let acercaDeWindow;

/* para recargar la aplicacion solo en produccion */
if(process.env.NODE_ENV !== 'production') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '../node_modules', '.bin', 'electron')
  });
}

/* al iniciar la aplicacion */
app.on('ready', () => {
  //creo la ventana principal
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    icon: image
  });

  //cargo el archivo html principal
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'views/index.html'),
    protocol: 'file',
    slashes: true
  }))

  //cargo las notas guardadas
  loadDataNotes()

  //para cargar el menu personalizado
  const mainMenu = Menu.buildFromTemplate(templateMenu);
  Menu.setApplicationMenu(mainMenu);

  //cuando cierro la ventana principal cierro todo
  mainWindow.on('closed', () => {
    app.quit();
  });

});

/* funcion que abre una ventana par ala nueva nota */
function createNewNote() {
  newNoteWindow = new BrowserWindow({
    width: 500,
    height: 580,
    icon: image,
    title: 'Nueva nota'
  });

  //quito el navbar
  newNoteWindow.setMenu(null);

  //cargo el new-note.html
  newNoteWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'views/new-note.html'),
    protocol: 'file',
    icon: image,
    slashes: true
  }));

  //cuando cierro la ventana termino el proceso
  newNoteWindow.on('closed', () => {
    newNoteWindow = null;
  });
}

/* crea la ventana acerca de */
function createAcercaDe() {
  acercaDeWindow = new BrowserWindow({
    width: 300,
    height: 250,
    title: 'Acerca de'
  });

  //quito el navbar
/*   acercaDeWindow.setMenu(null); */

  //cargo el acerca-de.html
  acercaDeWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'views/acerca-de.html'),
    protocol: 'file',
    slashes: true
  }));

  //cuando cierro la ventana termino el proceso
  acercaDeWindow.on('closed', () => {
    acercaDeWindow = null;
  });
}

/* dialogo para importar backup  EN CONSTRUCCION*/
function importBackup() {
  dialog.showOpenDialog({ 
    properties: ['openFile', 'multiSelections'],
    filters: [      
      { name: 'Files', extensions: ['txt'] }
    ]
  }, function (files) {
      //si no esta vacio files== ruta del archivo seleccionado
      if (files !== undefined) {
        console.log(files);
      }
  });
}


/* funcion que carga las notas guardadas al cargar el programa */
function loadDataNotes() {  
  //si existe el archivo cargo las notas guardadas
  if (fs.existsSync('dataNotes.txt')) {
    fs.readFile('dataNotes.txt', 'utf8', function (err, contents) {
      //Creo el array con el contenido del archivo cortando por linea
      let contenido = contents.split("\n");
      //recorro el array y corto por el caracter de control "|%"
      contenido.forEach(element => {
        if(element != ''){
          //creo array con titulo, contenido
          let partes = element.split("|%");        
          //creo el objeto
          const newNote = {
            title: partes[0],
            content: partes[1]
          };

          //cuando el proceso estea listo para escuchar mando los datos
          mainWindow.webContents.on('did-finish-load', () => {    
            //mando los datos a la pantalla principal
            mainWindow.webContents.send('product:new', newNote);
          });
        }
      });
    });
  }
}

/* funcion para guardar las notas en un archivo */
function saveInFile(nota) {
  //creo el archivo si no existe
  if (!fs.existsSync('dataNotes.txt')){
    fs.appendFile('dataNotes.txt','',(error) => {
      if(error){}
    });
  }

  //guardo el nuevo contenido
  var stream = fs.createWriteStream("dataNotes.txt", { flags: 'a' });
  stream.write(nota.title + '|%' + nota.content + "\n");
}

/* elimina el archivo al eliminar todas las notas */
function deleteDataNotes() {
  fs.unlink("dataNotes.txt", (err) => {
    if (err) {
      
    }
  });
}

/* escucho el evento de guardar una nueva nota */
ipcMain.on('product:new', (e, newProduct) => {
  // send to the Main Window
  console.log(newProduct);
  mainWindow.webContents.send('product:new', newProduct);
  //guardo la nota en archivo
  saveInFile(newProduct);
  //cierro la ventana de nueva nota
  newNoteWindow.close();
});


// Menu Template
const templateMenu = [
  {
    label: 'Archivo',
    submenu: [
      {
        label: 'Nueva nota',
        accelerator: 'Ctrl+N',
        click() {
          createNewNote();
        }
      },
      {
        label: 'Borrar todo',
        accelerator: process.platform == 'darwin' ? 'command+D' : 'Ctrl+D',
        click() {
          mainWindow.webContents.send('notes:remove-all');
          //elimino el archivo que contiene las notas
          deleteDataNotes();
        }

      },
      {
        label: 'Importar Backup(txt)',
        click() {
          importBackup();
        }
      },
      {
        label: 'Recargar',
        role: 'reload'
      },
      {
        label: 'Salir',
        accelerator: process.platform == 'darwin' ? 'command+Q' : 'Ctrl+Q',
        click() {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Ayuda',
    submenu: [
      {
        label: 'Acerca de',
        click() {
          createAcercaDe();
        }
      }
    ]
  }
];

/* Si se habre la aplicacion en MAC, en el navbar nos aparece una opcion con el
nombre de la aplicacion, para evitar esto, compruebo si estoy en mac */
if (process.platform === 'darwin') {
  templateMenu.unshift({
    label: app.getName(),
  });
};

/* activo las opciones de desarrollo en navbar si estoy en produccion  */
if (process.env.NODE_ENV !== 'production') {
  templateMenu.push({
    label: 'DevTools',
    submenu: [
      {
        label: 'Mostrar/ocultar DevTools',
        accelerator: process.platform == 'darwin' ? 'F12' : 'F12',
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      },
      //pestaña para refrescar la pagina
      {
        role: 'reload'
      }
    ]
  })
}
