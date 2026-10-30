# Atlantic Cozytouch — Gladys Assistant integration (unofficial)


### Controllable modes

Besides mode, target (heat and cool) and swing: eco, boost, silence,
presence/away and weekly program — the same capabilities as the Home Assistant
integration.
This integration brings Atlantic air conditioners and heat pumps controlled
by **Cozytouch** (Takao M3 and other connected Atlantic equipment) into
Gladys Assistant.

## What it does

One device per controllable room of the Cozytouch account, with: on/off
switch, mode select (off, heating, cooling, auto, fan), writable target
temperature (heating or cooling capacity follows the current mode), room
temperature sensor with history, state text, and a fan speed select
(Auto/Low/Medium/High) when the equipment exposes it.

## Prerequisites

- A Cozytouch account that works in the Atlantic app on your phone.
- Gladys Assistant 5.1 or later.

## Setup

1. Install the integration from **Integrations** in Gladys.
2. In the **Configuration** tab, enter the Cozytouch e-mail and password,
   then click **Test the connection**: the number of controllable rooms is
   shown.
3. Open the **Discovery** tab and create the rooms you want.

If a room is missing from discovery, find its numeric id (magellan deviceId
in the app's developer tools) and enter it in the “Room id” field.

The integration talks to the Atlantic Magellan cloud over the Internet, like
the official app; your credentials stay in the Gladys configuration (secret
field).

## Troubleshooting

- “0 controllable room(s) found”: check the credentials; for accounts with
  several installations, use the “Room id” field.
- The heating and cooling setpoints are a single feature in Gladys: the
  integration writes the capability matching the current mode.

Unofficial community integration, not affiliated with Groupe Atlantic.
