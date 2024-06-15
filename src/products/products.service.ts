import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { title } from 'process';
import { ProductImage } from './entities';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productoRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productoImageRepository: Repository<ProductImage>,

  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const {images = [], ...productDetails} = createProductDto;
      const product = this.productoRepository.create({
        ...productDetails,
        images: images.map(image =>  this.productoImageRepository.create({url: image}))
      });

      await this.productoRepository.save(product);

      return product;
      
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;
    return await this.productoRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOne(key: string) {
    let product: Product;

    if (isUUID(key)) {
      product = await this.productoRepository.findOneBy({ id: key });
    } else {
      const queryBuilder = this.productoRepository.createQueryBuilder();
      product = await queryBuilder
        .where('title =:title or slug =:slug', {
          title: key,
          slug: key,
        })
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with ID ${key} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productoRepository.preload({
      id: id,
      ...updateProductDto,
      images: [],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID: ${id} not found`);
    }
    try {
      await this.productoRepository.save(product);

      return product;
    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productoRepository.delete({ id });
  }

  private handleExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpetcted erro, chek server logs',
    );
  }
}
