import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll({ page, limit }: PaginationDto) {
    const total = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(total / limit);
    return {
      data: await this.product.findMany({
        where: { available: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      meta: {
        page,
        total,
        lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true },
    });

    if (!product) {
      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return product;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(id: number, { id: __, ...updateProductDto }: UpdateProductDto) {
    await this.findOne(id);
    return this.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.product.update({ where: { id }, data: { available: false } });
  }

  async validateProducts(ids: number[]) {
    const idsNonRepeated = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: idsNonRepeated,
        },
      },
    });

    if (products.length !== idsNonRepeated.length) {
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}
