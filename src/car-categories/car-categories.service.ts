import { Injectable } from '@nestjs/common';
import { CreateCarCategoryDto } from './dto/create-car-category.dto';
import { UpdateCarCategoryDto } from './dto/update-car-category.dto';

@Injectable()
export class CarCategoriesService {
  create(createCarCategoryDto: CreateCarCategoryDto) {
    return 'This action adds a new carCategory';
  }

  findAll() {
    return `This action returns all carCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} carCategory`;
  }

  update(id: number, updateCarCategoryDto: UpdateCarCategoryDto) {
    return `This action updates a #${id} carCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} carCategory`;
  }
}
