using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIPersonalAssistant.Migrations
{
    /// <inheritdoc />
    public partial class UserReflection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserReflections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    ContextType = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    VoiceTranscript = table.Column<string>(type: "TEXT", nullable: true),
                    AIFeedback = table.Column<string>(type: "TEXT", nullable: true),
                    ProcessedActionsJson = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserReflections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserReflections_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$6oxMfDVwCeUxiPzw0757d.3eDNJ6j4mCPMbiRxfV.kDsQdnrqD5dG");

            migrationBuilder.CreateIndex(
                name: "IX_UserReflections_UserId",
                table: "UserReflections",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserReflections");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$z5GiKsOsPLKtp4p6ApuO1eSqAubBNubWmViAJ9ZA9HpJ8B05U6VFe");
        }
    }
}
