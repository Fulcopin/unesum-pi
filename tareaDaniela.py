import random


inventario = []

for i in range(7): 
    cantidad_aleatoria = random.randint(0, 100) 
    
   
    inventario.append(cantidad_aleatoria)

print( inventario)




inventario_original = inventario.copy()


total_unidades = sum(inventario)
promedio = total_unidades / len(inventario)
maximo = max(inventario)
minimo = min(inventario)


print(f"Total de unidades ")
print(total_unidades)
print(f"Promedio ")
print(round(promedio,1))
print(f"Cantidad máxima ")
print(maximo)
print(f"Cantidad mínima ")
print(minimo)


inventario.sort(reverse=True)
print(inventario)
print(" posiciones con mayor stock ")
print(inventario[:3])
print("posiciones con menor stock") 
print(inventario[-3:])


inventario.append(45)
inventario.append(82)
print( inventario)

unidades_retiradas = inventario.pop()
print(" Bodega cerrada ")
print(unidades_retiradas)
print("   Lista después de cerrar la bodega ")
print(inventario)

if promedio < 20:
    estado = "crítico"
elif 20 <= promedio <= 39:
    estado = "bajo"
elif 40 <= promedio <= 69:
    estado = "normal"
else:
    estado = "abundante"

print(f"Clasificación del inventario:")
print(f"Nivel promedio ")
print(round(promedio,1) ,estado)