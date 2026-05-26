export class LigneCommandeGroupeeDto {
  articleId!: string;
  nomArticle?: string;
  quantite!: number;
  prixUnitaire!: number;
  collaborateurId?: string;
  instructions?: string;
}

export class CreateCommandeGroupeeDto {
  dateLivraison!: string;
  heureLivraison!: string;
  lieuLivraison!: string;
  adresseLivraison?: string;
  lignes!: LigneCommandeGroupeeDto[];
}
