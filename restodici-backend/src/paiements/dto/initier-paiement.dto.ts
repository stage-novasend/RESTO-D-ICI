import { NovaSendProvider } from '../novasend.service';

export class InitierPaiementDto {
  commandeId!:   string;
  provider!:     NovaSendProvider;
  montant!:      number;
  telephone?:    string;
  customerName?: string;
}
