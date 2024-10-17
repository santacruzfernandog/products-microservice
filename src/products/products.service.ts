import { HttpStatus, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto
    })
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const totalRows = await this.product.count({ where: { isAvailable: true } });
    const totalPages = Math.ceil(totalRows / limit);

    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { isAvailable: true }
      }),
      metadata: {
        page, totalRows, totalPages
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id, isAvailable: true }
    })

    if (!product)
      throw new RpcException({
        message: `Product #${id} not found`,
        status: HttpStatus.BAD_REQUEST
      });

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;
    await this.findOne(id);
    
    return this.product.update({
      where: { id },
      data
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // Soft delete
    const product = await  this.product.update({
      where: { id },
      data: { isAvailable: false }
    });

    return product;

    // Hard delete
    // return this.product.delete({
    //   where: { id }
    // });
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids)); // Remove duplicates

    const products = await this.product.findMany({
      where: { id: {in: ids} }
    });

    if(products.length !== ids.length) {
      throw new RpcException({
        message: `One or more products were not found`,
        status: HttpStatus.BAD_REQUEST
      });
    }

    return products;
  }
}
