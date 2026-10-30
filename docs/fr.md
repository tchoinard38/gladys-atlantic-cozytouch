# Atlantic Cozytouch — intégration Gladys Assistant (non officielle)

Cette intégration amène dans Gladys Assistant les climatisations et pompes à
chaleur Atlantic pilotées par **Cozytouch** (Takao M3, et les autres
équipements connectés de la gamme Atlantic).

## Ce qu'elle fait

Un appareil par pièce pilotable du compte Cozytouch, avec les fonctions :

| Fonction | Dans Gladys |
| --- | --- |
| Marche / arrêt | interrupteur de la climatisation |
| Mode | arrêt, chauffage, climatisation, auto, ventilation |
| Température de consigne | consigne écrivable (chaud ou froid selon le mode) |
| Température ambiante | capteur de température (°C), historique |
| État | texte : mode en cours |
| Vitesse de ventilation | sélection Auto / Faible / Moyen / Fort (si l'appareil l'expose) |

## Prérequis

- Un compte Cozytouch qui fonctionne dans l'application Atlantic sur votre
  téléphone.
- Un compte Gladys Assistant en version 5.1 ou plus.

## Configuration

1. Ouvrez **Intégrations** dans Gladys, installez cette intégration.
2. Dans l'onglet **Configuration**, saisissez l'e-mail et le mot de passe
   Cozytouch, puis cliquez sur **Tester la connexion** : le nombre de pièces
   pilotables s'affiche.
3. Ouvrez l'onglet **Découverte** et créez les pièces voulues.

Si une pièce n'apparaît pas dans la découverte, relevez son id numérique
(deviceId de l'API magellan, visible dans les outils développeur de
l'application) et saisissez-le dans le champ « ID de pièce ».

L'intégration se connecte au cloud Magellan d'Atlantic par Internet, comme
l'application officielle ; vos identifiants restent dans la configuration
Gladys (champ secret).

## Dépannage

- « 0 pièce pilotable trouvée » : vérifiez les identifiants ; si le compte
  gère plusieurs installations, utilisez le champ « ID de pièce ».
- La consigne chauffeur et la consigne clim sont une seule feature dans
  Gladys : l'intégration écrit dans la capacité correspondant au mode courant.

Intégration communautaire non officielle, sans lien avec Atlantic (Groupe
Atlantic).
