/* ═══════════════════════════════════════════════════════════════
   email/logo-asset.ts — logo Resto d'ici embarqué pour les emails.

   FICHIER GÉNÉRÉ — ne pas éditer à la main.
   Régénérer avec : node scripts/build-email-logo.mjs

   Le logo est joint à chaque email en pièce intégrée (CID) plutôt que
   référencé par une URL. Deux raisons :

   1. Aucune dépendance à FRONTEND_URL. Une variable d'environnement mal
      renseignée en production ne peut plus produire une image cassée chez le
      destinataire — l'image voyage avec le message.
   2. Les clients de messagerie bloquent fréquemment les images distantes
      (Gmail demande confirmation, Outlook les bloque par défaut). Une pièce
      intégrée s'affiche sans invite.

   Source : restodici-frontend/public/logo-mark.svg, rendu à 128×128.
   ═══════════════════════════════════════════════════════════════ */

/** PNG 128×128 encodé en base64 (9454 octets une fois décodé). */
export const EMAIL_LOGO_PNG_BASE64 =
  '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' +
  'z/NNyGf61ngThzVG5INlAN144GlUoLPP88XRn0Tu7O+wSIPR+SXva1zeRx3RjZwPfplM1HHQiOTafpgJ3q2SCT71FATPBBJahgHq' +
  'yfl68NJywBpH5pw1QgukTJwf7cedFyIb5/vIP/Yz5Px56c7/23OU9gn5be8ag6jRnA+WntOQD6Hro3orBUGWTPCvYSZIOl8EGyLh' +
  'DxPypZaJ7cgP3UwnVjj5ovO8DMi8Js6PjFw753uLPLl/vquq80u0wifa3mV9TSI/6lx3cz4EdA6WulO2voWO79Ei0JY3rf30M8HZ' +
  'i/xgiBHP9PFMUOM8P/YHkvtE/jvaC8sd8cCON+neZ3ikwRhp0BAYGgGohfO9rbzn/JQiVz2L4m2TgY5tqIZ88P1In2acEPlsP/M8' +
  '32LEiPMBgz4RZxpyfjsFgawSBIXTv68gPakPFuRzf1TlfL7/zOArN212gjY8qmQA3XjgaVSgs/N8v/bm+ENTlk5X/A6lO6YQ8reA' +
  'p20d+XXnfA15ep3K+WCIhEHvZnpYdf8kf2xgK86Yf4QYcywayfnKOg+cR/3/A0ULuVGMnC9h7HQWzldsQs/m5ctLjEaQb/wGxTun' +
  'ZUJ+IzifT8kSyJcwBr2Zg+N+R070guD7E9MzQbD0zTOBdsCiLxvn86B2JRZGAVD4XvE5epDwZqPm+bHxK/ul+86GXPms0nn5ylKU' +
  '7vqw//HI+DYT8oEe4XzNuKp8mcgsSCARfiYo/uAkf4CoF7nhryivfjrQBy1YudPDK7g+O+dDC+pg/61+F7X6X6tyQl2udH8OQ8Qp' +
  'Ru4k50dIDIOLVvJKN34I5QdnQP5pPso/moMipf3EX9eCCflAXTif1XXl/IQ+lYPdd1eg/f4JcFf/GpHzV/0K7Q+dClFuZ/IBJUpZ' +
  'kPFMU43zk/7wL18QdTlsROnfmk6ne34KTTegphuhpZ+05/mqnAzntW1j2vf1SaVdXdWnpn1oluF6DLV3PmP/dT1in5P9T8u4KxZb' +
  '22bWZ+6/Ih+W/nj7Amf0m709HgN4JZfrWEJGbk+mUdX5WThfSSQarUitc6Z5N0T3cL6eHm3Ij+kvGQRWzo/0yaRzglq+/iTcNxYz' +
  'e3HDwRh0neV85o+O9qY+S0ITRQEgvo3NdO/S0JmIjFw750edB9SQZH2DJVi4vl4/zzc4TeH8cF+qSFT0GYJFdTrADViN8/WBrO4P' +
  'GustGXz+puCDyywAvOLm5WWKkevF+YlaDxY78sH3I32acRR9NiRy43cf5+vIh1WfcgF4kPFMU43zJaQF+ZW65DrKJ9EFtNJxbtND' +
  'dPDjtvTzXub8HvkOn1WPZduoz9x/RT4sehQd4r/6zm79BDuiZgCvlOFcRReW1UhL53wlvVfjfOV493K+nh7rOs+P9JmRr53bLcwA' +
  'AASLSURBVCI+NAc3HACrvq5wfmB/gbLIl6+EVhIB0DKv7Q26Z14tnB8bH2pIstOR08CPJzk/2kc3c75mXFV+jLwucz748TiYoQU3' +
  'MnI+RDrns8Qxr2VG2wpoJREAXinI/DXUuDaIBnM+TMgH6sL54MbvpZwPDaqKU+3ByfUl/YFk7aCtlHO+DEMxBoCY17pWCOfWJBLT' +
  'axa4Wq3RRm9/ng+p5c+kfmGou/t5fuo7nFD037rbjG3Gv9drDACv5GXb10n4ZhPnK7bYNc9HKudLNRPEhkPS+ZG+OnB+3N8tLW7L' +
  'dbAUawB46wKulOdDJDlfiTQN+UJHvhYsOvKjznU350NA52CZcErSaTVzviFYVKcH+xk5Xx/IJv0Ri6sEizxXzNkY/nmVRLEGgFf6' +
  '3NPxXzQFu16NtC5wvgH54PsATMjPxPmSG7+Xcr4R+QDPNNU4X6czk7goWIFr+87e8TBSikCVIufCKa5t+iEJ/bjxDlsQGLZ15++a' +
  '54f6zP1X5MOix6bPEQ/3ndn6MVQpTrULxFy4heaOcygEl5uQL7XOqemoezlfT4871Txf1ffHlvbWTyFDqZoBwrL9cy1j8sL9A20O' +
  'Ve5Mi8SgVp0ftln8v/jePpgzpOFeVZ9UM5Gl/1yfhCa/un3eoX6+v+/MHauRoVTNAGHpe9eO1UIK77OcxcycDxPyUR/OZ/XOPs9H' +
  'nHmKdOMZWZ3vlcwB4JXCXW1PU6Pm8L5FjUTc2F3zfC24EvrqO88Pg9aVmEODvvhNkwylpgDwStMd7d+iRk0mpRsQNLKnOD/WY+B8' +
  'cKTr+uL6vT7PDzY2COlM7Dd7+7dQYxHoZNlxUfO4nCt/QZsH6PzPnR81dmfgfEUOD+6wPUwia08WfXb7iJfoOc/JLbPaVqITpeYM' +
  'EJaWW9pWFGT70dTIx9KQD77v7+2a59uQr+yj+jyfrv/ZDrfPUZ11fmDarhWvXR0XNtOysbzCmPaxa57foHn+DS2fa708xEJnS6cz' +
  'AOI2yT63tl1Jrv4Xcvr2XfN8k756cr7cAcf5BC3yXNZV5wddrl9pu7jPvtTIudTIfyKnO7vm+UyiAfmhLqAK8iv7JTp/vyi7/973' +
  'orZVqFOpawCEpf3SpoMoX/87BcOZFNEiHhAyhHhIc4Ja6OsEzAnSQCu89hCU4S9qsidEmj5djhn5Jn1WmhHm9mRrd6L/Lm085Dil' +
  'a5pntr+KOpeGBEBYOi4pHCGd3Fdpc1pnkA+Gkp2O8ysx8dMcnKv7zNn2AhpUGhoAYem4vOUYKd2rKcKn1fQdvrS/pcuQBMb50oLE' +
  'JPIRc3ADv8NnRL6CdL098EZm86me22/O9uVocOmWAAiLnI0BHX2bP0y9nU6ap9Chge8pzlfkdI7zLfo20pjpccr2C1pEy8K05/f1' +
  'Lt0aALzI81AoDWn+YLkspxOyplPE7x0hbefg/NfpwALhluc379m2THwMZfRA6bEA0Iu8AgM70DRaFsQY6YrRjoPRZKvR1MIx9G80' +
  'NXQ0mXrAe4TzPQR7H96o/AO8hzNv0sO0N0VOvNm6o7Da+zgDekH5PwAAAP//ob9pWwAAAAZJREFUAwDtfKvtXNSYWAAAAABJRU5E' +
  'rkJggg==';

/** Identifiant référencé dans le HTML des emails via `cid:`. */
export const EMAIL_LOGO_CID = 'restodici-logo';

/** Nom de fichier présenté par le client de messagerie. */
export const EMAIL_LOGO_FILENAME = 'restodici-logo.png';
