export class CreateProductDto {
  sellerId!: string;
  title!: string;
  price!: number;
  stock!: number;
  isActive?: boolean;
}

