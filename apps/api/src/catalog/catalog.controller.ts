import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CatalogService } from './catalog.service';
import { CatalogAssetsService } from './catalog-assets.service';

@ApiTags('Catálogo')
@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly assets: CatalogAssetsService,
  ) {}

  @Get('items/:id/icon')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Retorna o ícone local de um item, versionado pelo checksum do catálogo',
  })
  @ApiQuery({ name: 'dataset', required: true })
  async getIcon(
    @Param('id', ParseIntPipe) id: number,
    @Query('dataset') checksum: string | undefined,
  ) {
    const bytes = await this.assets.getIcon(id, checksum);
    return new StreamableFile(bytes, {
      type: 'image/webp',
      length: bytes.length,
      disposition: 'inline',
    });
  }

  @Get('items')
  @ApiQuery({ name: 'ids', required: false, description: 'Até 100 IDs separados por vírgula' })
  @ApiOperation({ summary: 'Lista e busca itens do dataset ativo' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Palavras do nome sem distinção de acentos ou ID numérico',
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
