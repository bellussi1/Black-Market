import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CatalogService } from './catalog.service';

@ApiTags('Catálogo')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('items')
  @ApiOperation({ summary: 'Lista e busca itens do dataset ativo' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Prefixo do nome do item',
  })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'region', required: false, example: 'sa' })
  @ApiQuery({
    name: 'locale',
    required: false,
    example: 'pt',
    description: 'Idioma exato; sem fallback quando informado',
  })
  @ApiQuery({
    name: 'preferredLocale',
    required: false,
    example: 'pt',
    description: 'Preferência com fallback para o catálogo disponível na mesma região',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 48 })
  listItems(@Query() query: Record<string, unknown>) {
    return this.catalog.listItems(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lista categorias do dataset ativo' })
  @ApiQuery({ name: 'region', required: false, example: 'sa' })
  @ApiQuery({
    name: 'locale',
    required: false,
    example: 'pt',
    description: 'Idioma exato; sem fallback quando informado',
  })
  @ApiQuery({
    name: 'preferredLocale',
    required: false,
    example: 'pt',
    description: 'Preferência com fallback para o catálogo disponível na mesma região',
  })
  listCategories(@Query() query: Record<string, unknown>) {
    return this.catalog.listCategories(query);
  }

  @Get('items/:id/recipes')
  @ApiOperation({ summary: 'Lista receitas que produzem ou usam um item' })
  @ApiQuery({ name: 'direction', required: false, enum: ['produces', 'uses'] })
  @ApiQuery({ name: 'region', required: false, example: 'sa' })
  @ApiQuery({
    name: 'locale',
    required: false,
    example: 'pt',
    description: 'Idioma exato; sem fallback quando informado',
  })
  @ApiQuery({
    name: 'preferredLocale',
    required: false,
    example: 'pt',
    description: 'Preferência com fallback para o catálogo disponível na mesma região',
  })
  getItemRecipes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
    @Query('direction') direction: string | undefined,
  ) {
    return this.catalog.getItemRecipes(id, query, direction);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Retorna um item do dataset ativo' })
  @ApiQuery({ name: 'region', required: false, example: 'sa' })
  @ApiQuery({
    name: 'locale',
    required: false,
    example: 'pt',
    description: 'Idioma exato; sem fallback quando informado',
  })
  @ApiQuery({
    name: 'preferredLocale',
    required: false,
    example: 'pt',
    description: 'Preferência com fallback para o catálogo disponível na mesma região',
  })
  getItem(@Param('id', ParseIntPipe) id: number, @Query() query: Record<string, unknown>) {
    return this.catalog.getItem(id, query);
  }
}
