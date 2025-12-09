import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto implements Partial<CreateProductDto> {
  sellerId?: string;
  title?: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
}

