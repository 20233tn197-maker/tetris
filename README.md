# Tetris Multijugador LAN

Este proyecto es una versión colaborativa de Tetris que permite a varios jugadores conectarse y turnarse para colocar piezas en un mismo tablero compartido.

## Requisitos previos

- Node.js instalado en la máquina que actuará como servidor.
- Las demás máquinas clientes necesitan un navegador web moderno (Chrome, Firefox, Edge, etc.).
- Todas las computadoras deben estar en la misma red local.

## Configuración e instalación

1. Abre una terminal y navega al directorio del proyecto:
   ```bash
   cd C:\Users\CC7\Desktop\juegos\tetrisMultijugadorbeta
   ```

2. Instala las dependencias (sólo es necesario una vez):
   ```bash
   npm install
   ```

3. Inicia el servidor. `server.js` soporta las variables de entorno `HOST` y `PORT`.

- Arrancar en `localhost` (solo accesible desde la misma máquina):
  ```powershell
  $env:HOST='127.0.0.1'; $env:PORT='3001'; npm start
  ```

- Escuchar en todas las interfaces (permitir conexiones desde la LAN):
  ```powershell
  $env:HOST='0.0.0.0'; $env:PORT='3001'; npm start
  ```

El valor por defecto (si no se pasan variables) es `HOST=127.0.0.1` y `PORT=3000`.

## Conectar desde otra computadora

1. Averigua la dirección IP local de la máquina que ejecuta el servidor. En Windows usa:
   ```powershell
   ipconfig
   ```
   Busca la `IPv4 Address` del adaptador que use tu red.

2. En el navegador de otra máquina de la misma LAN abre:
   ```text
   http://<IP_DEL_SERVIDOR>:<PUERTO>
   ```
   Ejemplo si iniciaste con `PORT=3001`: `http://192.168.1.10:3001`.

3. Si el servidor no es accesible desde la LAN, asegúrate de:
   - Haber arrancado con `HOST='0.0.0.0'` (ver sección anterior).
   - Abrir el puerto en el Firewall de Windows (ejecutar PowerShell como Administrador):
     ```powershell
     New-NetFirewallRule -DisplayName "Tetris Server 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
     ```

   - Comprobar que ningún otro proceso use el puerto (ejemplo para `3000`):
     ```powershell
     netstat -ano | findstr :3000
     tasklist /FI "PID eq <PID>"
     ```

4. Para exponer el servidor a Internet debes configurar port forwarding en tu router hacia la IP local de tu equipo, o usar un túnel (ej. `ngrok`) si no quieres tocar la configuración del router.

> Nota: si otro proceso está usando el puerto verás errores `EACCES` o `EADDRINUSE`; cambia el puerto con la variable `PORT` o detén el proceso que lo ocupa.

## Cómo jugar

- Cada jugador controla su propia pieza sin necesidad de turnos. No hay límite: todos se mueven al mismo tiempo.
- Cuando cualquiera fija una pieza en el tablero compartido, el servidor recibe el nuevo estado y devuelve **una pieza distinta para cada jugador**. Estas piezas no llegan todas a la vez, sino una tras otra, separadas por medio segundo.
- El cliente mantiene una cola de piezas pendientes: si recibe varias antes de colocar la actual, se van acumulando y aparecerán automáticamente cuando corresponda.
- El recuadro de estado muestra la lista de jugadores y sus puntuaciones.
- Si un jugador se desconecta, el tablero se mantiene y los demás siguen recibiendo nuevas piezas.

## Notas adicionales

- El tablero y las piezas están sincronizados por el servidor; no se requiere ninguna configuración adicional en los clientes.
- Si el servidor se cierra o la computadora anfitriona se desconecta de la red, las partidas se detendrán.

¡Disfruta jugando Tetris en grupo!