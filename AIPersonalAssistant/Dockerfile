# Stage 1: Build & Publish (Gunakan SDK dan beri nama AS build)
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

COPY AIPersonalAssistant.csproj ./
RUN dotnet restore AIPersonalAssistant.csproj

COPY . .
RUN dotnet publish AIPersonalAssistant.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Final (Gunakan ASPNET Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

RUN mkdir -p /app/data

# Ambil hasil publish dari stage 'build'
COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "AIPersonalAssistant.dll"]